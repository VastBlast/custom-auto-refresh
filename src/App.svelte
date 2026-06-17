<svelte:options runes={true} />

<script lang="ts">
  import { onMount } from 'svelte';
  import AlertTriangle from '@lucide/svelte/icons/triangle-alert';
  import Play from '@lucide/svelte/icons/play';
  import Square from '@lucide/svelte/icons/square';
  import Timer from '@lucide/svelte/icons/timer';
  import {
    DEFAULT_INTERVAL_SECONDS,
    MAX_INTERVAL_SECONDS,
    formatDurationSeconds,
    formatIntervalSeconds,
    formatRemaining,
    normalizeIntervalSeconds
  } from './lib/refresh/interval';
  import { getPopupState, startRefresh, stopRefresh } from './lib/refresh/client';
  import type { RefreshState } from './lib/refresh/types';
  import { getUiLanguage, t } from './lib/i18n/messages';

  const CLOCK_TICK_MS = 100;
  const STATE_POLL_MS = 500;
  const INTERVAL_UNITS = [
    { id: 'sec', label: 'sec', seconds: 1, step: '0.001', decimals: 3 },
    { id: 'ms', label: 'ms', seconds: 0.001, step: '1', decimals: 0 },
    { id: 'min', label: 'min', seconds: 60, step: '0.001', decimals: 3 },
    { id: 'hr', label: 'hr', seconds: 3600, step: '0.001', decimals: 4 }
  ] as const;

  type IntervalUnit = (typeof INTERVAL_UNITS)[number]['id'];

  let refreshState = $state<RefreshState | null>(null);
  let intervalInput = $state<string | number | null>(formatIntervalSeconds(DEFAULT_INTERVAL_SECONDS));
  let intervalUnit = $state<IntervalUnit>('sec');
  let busy = $state(false);
  let error = $state('');
  let now = $state(Date.now());
  let pollTimer: number | undefined;
  let clockTimer: number | undefined;

  const isActive = $derived(Boolean(refreshState?.isRefreshing));
  const selectedUnit = $derived(getIntervalUnit(intervalUnit));
  const intervalText = $derived(String(intervalInput ?? ''));
  const canStart = $derived(Boolean(refreshState?.canRefresh && !isActive && !busy && intervalText.trim()));
  const canStop = $derived(Boolean(refreshState?.canRefresh && isActive && !busy));
  const statusText = $derived(isActive ? t('active') : t('idle'));
  const remainingMs = $derived.by(() => {
    if (!refreshState?.isRefreshing) {
      return null;
    }
    if (refreshState.nextRefreshAt !== null) {
      return Math.max(0, refreshState.nextRefreshAt - now);
    }
    return refreshState.remainingMs;
  });
  const remainingText = $derived(formatRemaining(remainingMs));
  const maxIntervalInput = $derived(formatIntervalForUnit(MAX_INTERVAL_SECONDS, intervalUnit));
  const draftIntervalSeconds = $derived(getInputIntervalSeconds());
  const intervalSummary = $derived(formatDurationSeconds(draftIntervalSeconds));

  onMount(() => {
    document.documentElement.lang = getUiLanguage();
    void loadState(true);
    return clearTimers;
  });

  async function loadState(syncInterval: boolean) {
    try {
      applyState(await getPopupState(), syncInterval);
    } catch (caught) {
      clearStatePoll();
      error = getErrorMessage(caught);
    }
  }

  async function handleStart() {
    if (!intervalText.trim()) {
      error = t('invalidInterval');
      return;
    }

    busy = true;
    error = '';
    try {
      const seconds = getInputIntervalSeconds();
      if (seconds === null) {
        error = t('invalidInterval');
        return;
      }
      intervalInput = formatIntervalForUnit(seconds, intervalUnit);
      applyState(await startRefresh(seconds), true);
    } catch (caught) {
      error = getErrorMessage(caught);
    } finally {
      busy = false;
    }
  }

  async function handleStop() {
    busy = true;
    error = '';
    try {
      applyState(await stopRefresh(), true);
    } catch (caught) {
      error = getErrorMessage(caught);
    } finally {
      busy = false;
    }
  }

  function getInputIntervalSeconds(): number | null {
    const input = intervalText.trim();
    if (!input) {
      return null;
    }

    const value = Number(input);
    if (!Number.isFinite(value)) {
      return null;
    }

    return normalizeIntervalSeconds(value * selectedUnit.seconds);
  }

  function switchIntervalUnit(): void {
    const seconds = getInputIntervalSeconds();
    const nextUnit = getNextIntervalUnit(intervalUnit);
    intervalUnit = nextUnit;

    if (seconds !== null) {
      intervalInput = formatIntervalForUnit(seconds, nextUnit);
      return;
    }

    intervalInput = formatIntervalForUnit(refreshState?.intervalSeconds ?? DEFAULT_INTERVAL_SECONDS, nextUnit);
  }

  function getNextIntervalUnit(unit: IntervalUnit): IntervalUnit {
    const index = INTERVAL_UNITS.findIndex((option) => option.id === unit);
    return INTERVAL_UNITS[(index + 1) % INTERVAL_UNITS.length].id;
  }

  function getIntervalUnit(unit: IntervalUnit) {
    return INTERVAL_UNITS.find((option) => option.id === unit) ?? INTERVAL_UNITS[0];
  }

  function formatIntervalForUnit(seconds: number, unit: IntervalUnit): string {
    const option = getIntervalUnit(unit);
    const value = seconds / option.seconds;
    if (Number.isInteger(value)) {
      return String(value);
    }
    return value.toFixed(option.decimals).replace(/0+$/, '').replace(/\.$/, '');
  }

  function getErrorMessage(caught: unknown): string {
    return caught instanceof Error ? caught.message : t('cannotRefresh');
  }

  function applyState(next: RefreshState, syncInterval: boolean): void {
    now = Date.now();
    refreshState = next;
    error = '';
    if (syncInterval || next.isRefreshing) {
      intervalInput = formatIntervalForUnit(next.intervalSeconds, intervalUnit);
    }
    scheduleStatePoll(next.isRefreshing);
    setClockActive(next.isRefreshing);
  }

  function scheduleStatePoll(active: boolean): void {
    clearStatePoll();
    if (active) {
      pollTimer = window.setTimeout(() => void loadState(false), STATE_POLL_MS);
    }
  }

  function setClockActive(active: boolean): void {
    if (!active) {
      clearClock();
      return;
    }
    if (clockTimer === undefined) {
      clockTimer = window.setInterval(() => {
        now = Date.now();
      }, CLOCK_TICK_MS);
    }
  }

  function clearTimers(): void {
    clearStatePoll();
    clearClock();
  }

  function clearStatePoll(): void {
    if (pollTimer !== undefined) {
      window.clearTimeout(pollTimer);
      pollTimer = undefined;
    }
  }

  function clearClock(): void {
    if (clockTimer !== undefined) {
      window.clearInterval(clockTimer);
      clockTimer = undefined;
    }
  }
</script>

<main data-theme="refresh" class="w-[326px] bg-base-100 p-3.5 text-base-content">
  <header class="flex items-center justify-between gap-2">
    <div class="flex min-w-0 items-center gap-2">
      <img
        class="size-8 shrink-0 rounded-lg"
        src={isActive ? '/icons/active/icon32.png' : '/icons/inactive/icon32.png'}
        alt=""
        aria-hidden="true"
      />
      <div class="min-w-0">
        <h1 class="truncate text-sm font-bold leading-tight">{t('extensionName')}</h1>
        <div class="mt-0.5 flex items-center gap-1.5">
          <span class={['badge badge-soft badge-xs', isActive ? 'badge-success' : 'badge-neutral']}>
            {statusText}
          </span>
        </div>
      </div>
    </div>
    <div class="tooltip tooltip-left" data-tip="GitHub">
      <a
        class="btn btn-ghost btn-sm h-8 min-h-8 gap-1.5 px-2 text-xs"
        href="https://github.com/VastBlast/ChromeAutoRefresh"
        target="_blank"
        rel="noreferrer"
        aria-label={t('sourceCode')}
      >
        <svg class="size-4 shrink-0" viewBox="0 0 98 96" aria-hidden="true">
          <path
            fill="currentColor"
            fill-rule="evenodd"
            clip-rule="evenodd"
            d="M48.9 0C21.9 0 0 21.9 0 48.9c0 21.6 14 39.9 33.4 46.4 2.4.4 3.3-1.1 3.3-2.4v-8.4c-13.6 3-16.5-6.6-16.5-6.6-2.2-5.7-5.4-7.2-5.4-7.2-4.4-3 .3-2.9.3-2.9 4.9.3 7.5 5 7.5 5 4.4 7.5 11.5 5.3 14.3 4.1.4-3.2 1.7-5.3 3.1-6.6-10.9-1.2-22.3-5.4-22.3-24.2 0-5.3 1.9-9.7 5-13.1-.5-1.2-2.2-6.2.5-12.9 0 0 4.1-1.3 13.4 5 3.9-1.1 8-1.6 12.2-1.6s8.3.5 12.2 1.6c9.3-6.3 13.4-5 13.4-5 2.7 6.7 1 11.7.5 12.9 3.1 3.4 5 7.8 5 13.1 0 18.8-11.4 23-22.3 24.2 1.8 1.5 3.4 4.5 3.4 9.1v13.5c0 1.3.9 2.8 3.4 2.4 19.4-6.5 33.4-24.8 33.4-46.4C97.8 21.9 75.9 0 48.9 0Z"
          />
        </svg>
        <span class="max-w-20 truncate">{t('sourceCode')}</span>
      </a>
    </div>
  </header>

  <section class="mt-3 space-y-1.5">
    <label class="block text-[11px] font-semibold text-base-content/65" for="interval">{t('intervalLabel')}</label>
    <div class="input interval-field h-10 min-h-10 w-full gap-2 bg-base-100 pr-1.5">
      <Timer size={15} class="text-base-content/50" aria-hidden="true" />
      <input
        class="grow text-sm font-semibold tabular-nums"
        id="interval"
        type="number"
        min="0"
        max={maxIntervalInput}
        step={selectedUnit.step}
        inputmode="decimal"
        bind:value={intervalInput}
        disabled={isActive || busy}
      />
      <button
        class="btn btn-ghost h-7 min-h-7 px-2 text-xs font-bold uppercase tracking-normal text-base-content/65 hover:bg-base-200"
        type="button"
        onclick={switchIntervalUnit}
        disabled={busy}
        title="Switch unit"
        aria-label="Switch interval unit"
      >
        {selectedUnit.label}
      </button>
    </div>
  </section>

  <div class="mt-3 grid grid-cols-2 gap-2">
    <button class="btn btn-primary h-10 min-h-10" type="button" disabled={!canStart} onclick={handleStart} title={t('start')}>
      <Play size={16} fill="currentColor" aria-hidden="true" />
      <span>{t('start')}</span>
    </button>
    <button class="btn btn-error btn-soft h-10 min-h-10" type="button" disabled={!canStop} onclick={handleStop} title={t('stop')}>
      <Square size={14} fill="currentColor" aria-hidden="true" />
      <span>{t('stop')}</span>
    </button>
  </div>

  <footer class="mt-2.5">
    {#if error}
      <div class="alert alert-error alert-soft min-h-0 gap-2 px-2.5 py-1.5 text-xs" role="alert">
        <AlertTriangle size={14} aria-hidden="true" />
        <span class="min-w-0">{error}</span>
      </div>
    {:else if refreshState?.canRefresh}
      <div class="flex items-center justify-between rounded-lg bg-base-200 px-2.5 py-2 text-xs" aria-live="polite">
        <span class="font-medium text-base-content/60">{isActive ? t('nextRefresh') : t('intervalLabel')}</span>
        <strong class="font-bold tabular-nums text-base-content">{isActive ? remainingText : intervalSummary}</strong>
      </div>
    {:else}
      <div class="alert alert-warning alert-soft min-h-0 gap-2 px-2.5 py-1.5 text-xs">
        <AlertTriangle size={14} aria-hidden="true" />
        <span class="min-w-0">{t('cannotRefresh')}</span>
      </div>
    {/if}
  </footer>
</main>
