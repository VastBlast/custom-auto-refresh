<svelte:options runes={true} />

<script lang="ts">
  import { onMount } from 'svelte';
  import { slide } from 'svelte/transition';
  import AlertTriangle from '@lucide/svelte/icons/triangle-alert';
  import ChevronDown from '@lucide/svelte/icons/chevron-down';
  import Play from '@lucide/svelte/icons/play';
  import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
  import SlidersHorizontal from '@lucide/svelte/icons/sliders-horizontal';
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
  import {
    DEFAULT_OPTIONS,
    MAX_REFRESHES,
    MAX_STOP_AFTER_MINUTES,
    hasNonDefaultOptions,
    sanitizeOptions
  } from './lib/refresh/options';
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
  let showAdvanced = $state(false);
  let bypassCache = $state(false);
  let refreshImmediately = $state(false);
  let maxRefreshesInput = $state<number | null>(null);
  let stopAfterInput = $state<number | null>(null);
  let pollTimer: number | undefined;
  let clockTimer: number | undefined;
  let optionsInitialized = false;

  const isActive = $derived(Boolean(refreshState?.isRefreshing));
  const selectedUnit = $derived(getIntervalUnit(intervalUnit));
  const intervalText = $derived(String(intervalInput ?? ''));
  const canStart = $derived(Boolean(refreshState?.canRefresh && !isActive && !busy && intervalText.trim()));
  const canStop = $derived(Boolean(refreshState?.canRefresh && isActive && !busy));
  const canSwitchUnit = $derived(!isActive && !busy);
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
  const optionsDisabled = $derived(isActive || busy);
  const draftOptions = $derived(
    sanitizeOptions({
      bypassCache,
      refreshImmediately,
      maxRefreshes: maxRefreshesInput,
      stopAfterMinutes: stopAfterInput
    })
  );
  const canResetOptions = $derived(!optionsDisabled && hasNonDefaultOptions(draftOptions));

  onMount(() => {
    document.documentElement.lang = getUiLanguage();
    void loadState(true);
    return clearTimers;
  });

  // Focus the interval field on open so the user can type or press Enter at once.
  function autofocus(node: HTMLInputElement) {
    node.focus();
    node.select();
  }

  function resetOptions(): void {
    bypassCache = DEFAULT_OPTIONS.bypassCache;
    refreshImmediately = DEFAULT_OPTIONS.refreshImmediately;
    maxRefreshesInput = DEFAULT_OPTIONS.maxRefreshes;
    stopAfterInput = DEFAULT_OPTIONS.stopAfterMinutes;
  }

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
      applyState(await startRefresh(seconds, draftOptions), true);
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
    if (!canSwitchUnit) {
      return;
    }

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
      bypassCache = next.options.bypassCache;
      refreshImmediately = next.options.refreshImmediately;
      maxRefreshesInput = next.options.maxRefreshes;
      stopAfterInput = next.options.stopAfterMinutes;
    }
    if (!optionsInitialized) {
      optionsInitialized = true;
      showAdvanced = hasNonDefaultOptions(next.options);
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
        class="size-8 shrink-0 drop-shadow-sm"
        src={isActive ? '/icons/active/icon32.png' : '/icons/inactive/icon32.png'}
        alt=""
        aria-hidden="true"
      />
      <div class="min-w-0">
        <h1 class="truncate text-sm font-bold leading-tight">{t('extensionName')}</h1>
        <div class="mt-1 flex items-center gap-1.5">
          <span class={['badge badge-soft badge-xs gap-1.5 pl-1.5 font-medium', isActive ? 'badge-success' : 'badge-neutral']}>
            <span class="relative flex size-1.5">
              {#if isActive}
                <span class="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-70"></span>
              {/if}
              <span class={['relative inline-flex size-1.5 rounded-full', isActive ? 'bg-success' : 'bg-base-content/40']}></span>
            </span>
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
    <div class="input h-10 min-h-10 w-full gap-2 bg-base-100 pr-1.5">
      <Timer size={15} class="text-base-content/50" aria-hidden="true" />
      <input
        class="grow text-sm font-semibold tabular-nums"
        id="interval"
        type="number"
        min="0"
        max={maxIntervalInput}
        step={selectedUnit.step}
        inputmode="decimal"
        {@attach autofocus}
        bind:value={intervalInput}
        disabled={isActive || busy}
        onkeydown={(event) => {
          if (event.key === 'Enter' && canStart) {
            void handleStart();
          }
        }}
      />
      <button
        class="btn btn-sm h-7 min-h-7 rounded-md border-0 bg-base-200 px-2.5 text-xs font-bold uppercase tracking-wide text-base-content/70 shadow-none hover:bg-base-300"
        type="button"
        onclick={switchIntervalUnit}
        disabled={!canSwitchUnit}
        title="Switch unit"
        aria-label="Switch interval unit"
      >
        {selectedUnit.label}
      </button>
    </div>
  </section>

  <section class="mt-2.5">
    <button
      class="btn btn-ghost btn-sm flex h-8 min-h-8 w-full items-center justify-between px-2 text-xs font-semibold text-base-content/70 hover:bg-base-200"
      type="button"
      onclick={() => (showAdvanced = !showAdvanced)}
      aria-expanded={showAdvanced}
      aria-controls="advanced-panel"
    >
      <span class="flex items-center gap-1.5">
        <SlidersHorizontal size={14} aria-hidden="true" />
        Advanced
      </span>
      <ChevronDown size={15} class={['transition-transform duration-200', showAdvanced && 'rotate-180']} aria-hidden="true" />
    </button>

    {#if showAdvanced}
      <div
        id="advanced-panel"
        class="mt-2 space-y-2.5 rounded-lg border border-base-200 bg-base-200/35 p-2.5"
        transition:slide={{ duration: 200 }}
      >
        <label class="flex cursor-pointer items-center justify-between gap-3">
          <span class="flex min-w-0 flex-col">
            <span class="text-xs font-semibold">Hard reload</span>
            <span class="text-[10px] leading-tight text-base-content/55">Bypass the cache on each refresh</span>
          </span>
          <input class="toggle toggle-sm toggle-primary" type="checkbox" bind:checked={bypassCache} disabled={optionsDisabled} />
        </label>

        <label class="flex cursor-pointer items-center justify-between gap-3">
          <span class="flex min-w-0 flex-col">
            <span class="text-xs font-semibold">Refresh immediately</span>
            <span class="text-[10px] leading-tight text-base-content/55">Run the first refresh on start</span>
          </span>
          <input class="toggle toggle-sm toggle-primary" type="checkbox" bind:checked={refreshImmediately} disabled={optionsDisabled} />
        </label>

        <div class="h-px bg-base-300/70"></div>

        <div class="flex items-center justify-between gap-3">
          <label class="flex min-w-0 flex-col" for="max-refreshes">
            <span class="text-xs font-semibold">Maximum refreshes</span>
            <span class="text-[10px] leading-tight text-base-content/55">Stop after this many</span>
          </label>
          <input
            class="input input-sm h-8 w-24 bg-base-100 text-right text-xs font-semibold tabular-nums"
            id="max-refreshes"
            type="number"
            min="1"
            max={MAX_REFRESHES}
            step="1"
            inputmode="numeric"
            placeholder="Unlimited"
            bind:value={maxRefreshesInput}
            disabled={optionsDisabled}
          />
        </div>

        <div class="flex items-center justify-between gap-3">
          <label class="flex min-w-0 flex-col" for="stop-after">
            <span class="text-xs font-semibold">Time limit</span>
            <span class="text-[10px] leading-tight text-base-content/55">Stop after this long</span>
          </label>
          <div class="flex items-center gap-1.5">
            <input
              class="input input-sm h-8 w-20 bg-base-100 text-right text-xs font-semibold tabular-nums"
              id="stop-after"
              type="number"
              min="0"
              max={MAX_STOP_AFTER_MINUTES}
              step="1"
              inputmode="decimal"
              placeholder="Never"
              bind:value={stopAfterInput}
              disabled={optionsDisabled}
            />
            <span class="text-[10px] font-bold uppercase tracking-wide text-base-content/45">min</span>
          </div>
        </div>

        <!-- this is to fix transition lag because it adds 2.5 margin bottom when reset button is shown and removes when its hidden -->
        <div class="-mb-2.5!"></div>

        {#if canResetOptions}
          <div class="flex justify-end pt-0.5 mt-5" transition:slide={{ duration: 150 }}>
            <button
              class="btn btn-ghost btn-xs h-6 min-h-6 gap-1 px-2 text-[11px] font-medium text-base-content/55 hover:bg-base-200"
              type="button"
              onclick={resetOptions}
            >
              <RotateCcw size={12} aria-hidden="true" />
              Reset
            </button>
          </div>
        {/if}
      </div>
    {/if}
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
      <div class="flex items-center justify-between rounded-lg border border-base-200 bg-base-200/55 px-3 py-2 text-xs" aria-live="polite">
        <span class="font-medium text-base-content/60">{isActive ? t('nextRefresh') : t('intervalLabel')}</span>
        <span class="flex items-center gap-2">
          {#if isActive && refreshState.options.maxRefreshes !== null}
            <span class="font-semibold tabular-nums text-base-content/55">
              {refreshState.refreshCount}/{refreshState.options.maxRefreshes}
            </span>
          {/if}
          <strong class="font-bold tabular-nums text-base-content">{isActive ? remainingText : intervalSummary}</strong>
        </span>
      </div>
    {:else}
      <div class="alert alert-warning alert-soft min-h-0 gap-2 px-2.5 py-1.5 text-xs">
        <AlertTriangle size={14} aria-hidden="true" />
        <span class="min-w-0">{t('cannotRefresh')}</span>
      </div>
    {/if}
  </footer>
</main>
