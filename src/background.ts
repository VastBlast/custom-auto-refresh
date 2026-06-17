import {
  DEFAULT_INTERVAL_SECONDS,
  formatBadgeText,
  normalizeIntervalSeconds
} from './lib/refresh/interval';
import type { RefreshRequest, RefreshResponse, RefreshState } from './lib/refresh/types';

interface StoredRefreshJob {
  tabId: number;
  intervalMs: number;
  nextRefreshAt: number;
}

interface RefreshJob extends StoredRefreshJob {
  refreshing: boolean;
}

interface StoredState {
  jobs: StoredRefreshJob[];
  lastIntervals: Record<string, number>;
}

type IconState = 'active' | 'inactive';

interface ActionState {
  badgeText: string;
  icon: IconState;
}

const ACTION_ICON_SIZES = [16, 24, 32] as const;
const STORAGE_KEY = 'customAutoRefresh';
const KEEP_ALIVE_PORT = 'custom-auto-refresh:keepAlive';

// Jobs are held in memory for fast ticking and mirrored to storage so MV3
// service-worker restarts can resume active refreshes.
const jobs = new Map<number, RefreshJob>();

// Browser action updates are relatively expensive. This cache prevents repeated
// badge/icon writes, but it must be invalidated on navigation because Chrome can
// reset per-tab action icons while a page reloads.
const actionStates = new Map<number, ActionState>();
const iconImageData = new Map<IconState, Record<number, ImageData>>();
let lastIntervals: Record<string, number> = {};
let scheduler: ReturnType<typeof setTimeout> | undefined;
let initialized: Promise<void> | undefined;

void initialize();

chrome.runtime.onMessage.addListener((message: RefreshRequest, _sender, sendResponse) => {
  void handleMessage(message)
    .then((data) => sendResponse({ ok: true, data } satisfies RefreshResponse<RefreshState>))
    .catch((error) => {
      const message = error instanceof Error ? error.message : 'Refresh command failed.';
      sendResponse({ ok: false, error: message } satisfies RefreshResponse<RefreshState>);
    });
  return true;
});

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== KEEP_ALIVE_PORT) {
    return;
  }

  // MV3 service workers can suspend between timers. A long-lived port from a
  // normal web page keeps this worker available for accurate badge updates and
  // scheduled reloads; reconnect before Chrome's five-minute port limit.
  const tabId = port.sender?.tab?.id;
  const timer = setTimeout(() => port.disconnect(), 250000);
  port.onDisconnect.addListener(() => {
    clearTimeout(timer);
    if (jobs.size > 0) {
      void connectKeepAlive(tabId);
    }
  });
});

chrome.tabs.onRemoved.addListener((tabId) => {
  if (!jobs.has(tabId)) {
    return;
  }
  jobs.delete(tabId);
  actionStates.delete(tabId);
  void saveState();
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (!jobs.has(tabId)) {
    return;
  }
  if (changeInfo.url && !isRefreshableUrl(changeInfo.url)) {
    void stopTab(tabId);
    return;
  }

  // Navigation can clear the toolbar icon even though our in-memory job stays
  // active, so force the next update to rewrite the action state.
  if (changeInfo.url || changeInfo.status === 'loading' || changeInfo.status === 'complete') {
    actionStates.delete(tabId);
  }
  if (changeInfo.status === 'loading' || changeInfo.status === 'complete' || tab.status === 'complete') {
    void updateAction(tabId);
  }
  if (changeInfo.status === 'complete') {
    void connectKeepAlive(tabId);
  }
});

async function initialize(): Promise<void> {
  initialized ??= (async () => {
    const stored = await readStoredState();
    lastIntervals = stored.lastIntervals;
    jobs.clear();
    for (const job of stored.jobs) {
      if (job.tabId > 0 && job.intervalMs >= 0) {
        jobs.set(job.tabId, { ...job, refreshing: false });
      }
    }
    await Promise.all([...jobs.keys()].map((tabId) => updateAction(tabId)));
    scheduleTick();
    if (jobs.size > 0) {
      await connectKeepAlive();
    }
  })();
  return initialized;
}

async function handleMessage(message: RefreshRequest): Promise<RefreshState> {
  await initialize();
  if (message.type === 'popup:get-state') {
    return getActiveTabState();
  }
  if (message.type === 'refresh:start') {
    return startActiveTab(message.intervalSeconds);
  }
  if (message.type === 'refresh:stop') {
    return stopActiveTab();
  }
  throw new Error('Unknown refresh command.');
}

async function startActiveTab(intervalSeconds: number): Promise<RefreshState> {
  const tab = await getActiveTab();
  if (!tab?.id || !isRefreshableUrl(tab.url)) {
    throw new Error('This page cannot be refreshed by the extension.');
  }

  const intervalMs = normalizeIntervalSeconds(intervalSeconds) * 1000;
  jobs.set(tab.id, {
    tabId: tab.id,
    intervalMs,
    nextRefreshAt: Date.now() + intervalMs,
    refreshing: false
  });
  lastIntervals[String(tab.id)] = intervalMs;
  await saveState();
  await updateAction(tab.id);
  scheduleTick();
  void connectKeepAlive(tab.id);
  return getStateForTab(tab);
}

async function stopActiveTab(): Promise<RefreshState> {
  const tab = await getActiveTab();
  if (tab?.id) {
    await stopTab(tab.id);
  }
  return getStateForTab(tab);
}

async function stopTab(tabId: number): Promise<void> {
  const job = jobs.get(tabId);
  if (job) {
    lastIntervals[String(tabId)] = job.intervalMs;
    jobs.delete(tabId);
  }
  await saveState();
  await setInactiveAction(tabId);
}

async function runTick(): Promise<void> {
  scheduler = undefined;
  await initialize();
  const now = Date.now();

  // Iterate over a snapshot so jobs can be stopped safely while the tick is
  // running, for example if a tab becomes unrefreshable during reload.
  for (const job of [...jobs.values()]) {
    if (!job.refreshing && job.nextRefreshAt <= now) {
      void refreshTab(job).catch(() => undefined);
    } else {
      await updateAction(job.tabId);
    }
  }

  scheduleTick();
}

async function refreshTab(job: RefreshJob): Promise<void> {
  job.refreshing = true;
  try {
    await updateAction(job.tabId);
    const tab = await getTab(job.tabId);
    if (!tab || !isRefreshableUrl(tab.url)) {
      await stopTab(job.tabId);
      return;
    }

    // Register the completion listener before reloading so fast local pages
    // cannot complete before we start waiting.
    const complete = waitForTabComplete(job.tabId);
    await reloadTab(job.tabId);
    await complete;
    job.nextRefreshAt = Date.now() + job.intervalMs;
  } catch {
    await stopTab(job.tabId);
  } finally {
    const current = jobs.get(job.tabId);
    if (current) {
      current.refreshing = false;
      await updateAction(job.tabId);
    }
  }
}

function scheduleTick(): void {
  if (scheduler || jobs.size === 0) {
    return;
  }

  // Wake at the next due job, capped at one second so the badge countdown keeps
  // moving without creating one timer per tab.
  const now = Date.now();
  let nextDelay = 1000;
  for (const job of jobs.values()) {
    if (job.refreshing) {
      continue;
    }
    nextDelay = Math.min(nextDelay, job.nextRefreshAt - now);
  }
  nextDelay = Math.max(0, Math.min(1000, nextDelay));
  scheduler = setTimeout(() => void runTick(), nextDelay);
}

async function getActiveTabState(): Promise<RefreshState> {
  const tab = await getActiveTab();
  return getStateForTab(tab);
}

function getStateForTab(tab: chrome.tabs.Tab | undefined): RefreshState {
  const tabId = tab?.id;
  const job = tabId === undefined ? undefined : jobs.get(tabId);
  const fallbackMs = tabId === undefined ? DEFAULT_INTERVAL_SECONDS * 1000 : lastIntervals[String(tabId)];
  const intervalMs = job?.intervalMs ?? fallbackMs ?? DEFAULT_INTERVAL_SECONDS * 1000;

  return {
    canRefresh: Boolean(tabId && isRefreshableUrl(tab?.url)),
    isRefreshing: Boolean(job),
    intervalSeconds: intervalMs / 1000,
    remainingMs: job ? Math.max(0, job.nextRefreshAt - Date.now()) : null,
    nextRefreshAt: job?.nextRefreshAt ?? null
  };
}

async function updateAction(tabId: number): Promise<void> {
  const job = jobs.get(tabId);
  if (!job) {
    await setInactiveAction(tabId);
    return;
  }

  const remainingMs = Math.max(0, job.nextRefreshAt - Date.now());
  await setActionState(tabId, 'active', job.refreshing ? '...' : formatBadgeText(remainingMs, job.intervalMs));
}

async function setInactiveAction(tabId: number): Promise<void> {
  await setActionState(tabId, 'inactive', '');
}

async function setActionState(tabId: number, icon: IconState, badgeText: string): Promise<void> {
  const current = actionStates.get(tabId);
  if (current?.badgeText !== badgeText) {
    await chromeCall<void>((resolve) => chrome.action.setBadgeText({ tabId, text: badgeText }, resolve));
  }
  if (icon === 'active' && current?.icon !== 'active') {
    await chromeCall<void>((resolve) =>
      chrome.action.setBadgeBackgroundColor({ tabId, color: '#1a7f4b' }, resolve)
    );
  }
  if (current?.icon !== icon) {
    await chromeCall<void>((resolve) =>
      chrome.action.setIcon(
        {
          tabId,
          imageData: getActionIconData(icon)
        },
        resolve
      )
    );
  }
  actionStates.set(tabId, { badgeText, icon });
}

function getActionIconData(icon: IconState): Record<number, ImageData> {
  let cached = iconImageData.get(icon);
  if (!cached) {
    cached = {};
    for (const size of ACTION_ICON_SIZES) {
      cached[size] = createActionIconImageData(icon, size);
    }
    iconImageData.set(icon, cached);
  }
  return cached;
}

function createActionIconImageData(icon: IconState, size: number): ImageData {
  const canvas = new OffscreenCanvas(size, size);
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Could not create action icon.');
  }

  const scale = size / 32;
  context.scale(scale, scale);
  drawRoundedRect(context, 1, 1, 30, 30, 8, icon === 'active' ? '#187246' : '#2d3832');

  context.strokeStyle = '#f8fff9';
  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.lineWidth = 3.4;

  context.beginPath();
  context.arc(16, 17, 8, 0.68 * Math.PI, 1.88 * Math.PI);
  context.stroke();

  context.beginPath();
  context.moveTo(22, 7);
  context.lineTo(27, 7);
  context.lineTo(27, 12);
  context.stroke();

  context.beginPath();
  context.moveTo(16, 12);
  context.lineTo(16, 18);
  context.lineTo(21, 21);
  context.stroke();

  return context.getImageData(0, 0, size, size);
}

function drawRoundedRect(
  context: OffscreenCanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fill: string
): void {
  context.fillStyle = fill;
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.fill();
}

async function connectKeepAlive(tabId?: number): Promise<void> {
  const tabIds = tabId === undefined ? [...jobs.keys()] : jobs.has(tabId) ? [tabId] : [];
  const jobTabs = await Promise.all(tabIds.map((id) => getTab(id)));
  if (await connectToFirstAvailableTab(jobTabs)) {
    return;
  }

  // Some refresh targets reject script injection. A fallback HTTP(S) tab can
  // still hold the keep-alive port; refresh jobs themselves remain tab-scoped.
  const fallbackTabs = await queryRefreshableTabs();
  await connectToFirstAvailableTab(fallbackTabs);
}

async function connectToFirstAvailableTab(tabs: Array<chrome.tabs.Tab | undefined>): Promise<boolean> {
  for (const tab of tabs) {
    if (tab?.id === undefined || !isRefreshableUrl(tab.url)) {
      continue;
    }
    if (await injectKeepAlive(tab.id)) {
      return true;
    }
  }
  return false;
}

async function injectKeepAlive(tabId: number): Promise<boolean> {
  try {
    await chromeCall<chrome.scripting.InjectionResult<void>[]>((resolve) =>
      chrome.scripting.executeScript(
        {
          target: { tabId },
          func: connectPort,
          args: [KEEP_ALIVE_PORT]
        },
        resolve
      )
    );
    return true;
  } catch {
    return false;
  }
}

function connectPort(portName: string): void {
  chrome.runtime.connect({ name: portName });
}

function getActiveTab(): Promise<chrome.tabs.Tab | undefined> {
  return chromeCall((resolve) => chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => resolve(tabs[0])));
}

function getTab(tabId: number): Promise<chrome.tabs.Tab | undefined> {
  return chromeCall<chrome.tabs.Tab>((resolve) => chrome.tabs.get(tabId, resolve)).catch(() => undefined);
}

function queryRefreshableTabs(): Promise<chrome.tabs.Tab[]> {
  return chromeCall((resolve) => chrome.tabs.query({ url: ['http://*/*', 'https://*/*'] }, resolve));
}

function reloadTab(tabId: number): Promise<void> {
  return chromeCall((resolve) => chrome.tabs.reload(tabId, resolve));
}

function waitForTabComplete(tabId: number): Promise<void> {
  return new Promise((resolve) => {
    // Do not hang forever on pages that never report complete.
    const timeout = setTimeout(done, 60000);

    function listener(updatedTabId: number, changeInfo: { status?: string }): void {
      if (updatedTabId === tabId && changeInfo.status === 'complete') {
        done();
      }
    }

    function done(): void {
      clearTimeout(timeout);
      chrome.tabs.onUpdated.removeListener(listener);
      resolve();
    }

    chrome.tabs.onUpdated.addListener(listener);
  });
}

async function readStoredState(): Promise<StoredState> {
  const value = await chromeCall<Record<string, StoredState | undefined>>((resolve) =>
    chrome.storage.local.get(STORAGE_KEY, resolve)
  );
  return sanitizeStoredState(value[STORAGE_KEY]);
}

async function saveState(): Promise<void> {
  const stored: StoredState = {
    jobs: [...jobs.values()].map(({ tabId, intervalMs, nextRefreshAt }) => ({
      tabId,
      intervalMs,
      nextRefreshAt
    })),
    lastIntervals
  };
  await chromeCall<void>((resolve) => chrome.storage.local.set({ [STORAGE_KEY]: stored }, resolve));
}

function sanitizeStoredState(value: StoredState | undefined): StoredState {
  if (!value || typeof value !== 'object') {
    return { jobs: [], lastIntervals: {} };
  }

  // Extension storage is user/modifiable state, so validate it before trusting
  // persisted jobs after a service-worker restart or extension update.
  return {
    jobs: Array.isArray(value.jobs)
      ? value.jobs.filter(
          (job) =>
            Number.isInteger(job.tabId) &&
            Number.isFinite(job.intervalMs) &&
            job.intervalMs >= 0 &&
            Number.isFinite(job.nextRefreshAt)
        )
      : [],
    lastIntervals: value.lastIntervals && typeof value.lastIntervals === 'object' ? value.lastIntervals : {}
  };
}

function chromeCall<T>(action: (resolve: (value: T) => void) => void): Promise<T> {
  return new Promise((resolve, reject) => {
    action((value) => {
      const message = chrome.runtime.lastError?.message;
      if (message) {
        reject(new Error(message));
      } else {
        resolve(value);
      }
    });
  });
}

function isRefreshableUrl(url: string | undefined): boolean {
  return /^https?:\/\//i.test(url ?? '');
}
