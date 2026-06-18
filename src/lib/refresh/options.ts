// Advanced per-job refresh options. Shared by the popup (input) and the
// background service worker (authoritative validation). All values that cross
// the message boundary or come back from storage are untrusted, so everything
// flows through sanitizeOptions before use.

export interface RefreshOptions {
  /** Reload while bypassing the browser cache (hard reload). */
  bypassCache: boolean;
  /** Run the first refresh immediately instead of after one interval. */
  refreshImmediately: boolean;
  /** Stop automatically after this many refreshes (null = unlimited). */
  maxRefreshes: number | null;
  /** Stop automatically after this many minutes (null = no time limit). */
  stopAfterMinutes: number | null;
}

export const DEFAULT_OPTIONS: RefreshOptions = {
  bypassCache: false,
  refreshImmediately: false,
  maxRefreshes: null,
  stopAfterMinutes: null
};

export const MAX_REFRESHES = 1_000_000;
export const MAX_STOP_AFTER_MINUTES = 10_080; // one week, matching the interval ceiling

export function sanitizeOptions(value: unknown): RefreshOptions {
  const source = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const maxRefreshes = toFiniteNumber(source.maxRefreshes);
  const stopAfterMinutes = toFiniteNumber(source.stopAfterMinutes);
  return {
    bypassCache: source.bypassCache === true,
    refreshImmediately: source.refreshImmediately === true,
    maxRefreshes: maxRefreshes !== null && maxRefreshes >= 1 ? Math.min(MAX_REFRESHES, Math.floor(maxRefreshes)) : null,
    stopAfterMinutes:
      stopAfterMinutes !== null && stopAfterMinutes > 0
        ? Math.min(MAX_STOP_AFTER_MINUTES, Math.round(stopAfterMinutes * 1000) / 1000)
        : null
  };
}

export function hasNonDefaultOptions(options: RefreshOptions): boolean {
  return (
    options.bypassCache ||
    options.refreshImmediately ||
    options.maxRefreshes !== null ||
    options.stopAfterMinutes !== null
  );
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}
