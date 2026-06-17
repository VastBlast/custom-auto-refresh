export const DEFAULT_INTERVAL_SECONDS = 5;
export const MIN_INTERVAL_SECONDS = 0;
export const MAX_INTERVAL_SECONDS = 604800;

export function normalizeIntervalSeconds(value: number | string): number {
  if (typeof value === 'string' && !value.trim()) {
    return DEFAULT_INTERVAL_SECONDS;
  }
  const seconds = typeof value === 'number' ? value : Number(value.trim());
  if (!Number.isFinite(seconds)) {
    return DEFAULT_INTERVAL_SECONDS;
  }
  return Math.min(MAX_INTERVAL_SECONDS, Math.max(MIN_INTERVAL_SECONDS, roundInterval(seconds)));
}

export function formatIntervalSeconds(seconds: number): string {
  return Number.isInteger(seconds) ? String(seconds) : String(seconds).replace(/0+$/, '').replace(/\.$/, '');
}

export function formatDurationSeconds(seconds: number | null): string {
  if (seconds === null) {
    return '--';
  }
  return formatDurationMs(seconds * 1000);
}

export function formatRemaining(ms: number | null): string {
  if (ms === null) {
    return '--';
  }
  return formatDurationMs(ms);
}

function formatDurationMs(ms: number): string {
  if (ms <= 0) {
    return '0s';
  }
  if (ms < 100) {
    return `${Math.max(1, Math.round(ms))}ms`;
  }
  if (ms < 1000) {
    return `${formatDecimal(ms / 1000, 1)}s`;
  }

  const totalSeconds = Math.ceil(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

function formatDecimal(value: number, digits: number): string {
  return value.toFixed(digits).replace(/0+$/, '').replace(/\.$/, '');
}

export function formatBadgeText(remainingMs: number, intervalMs: number): string {
  if (remainingMs <= 0) {
    return '0';
  }
  if (intervalMs < 1000) {
    return Math.max(MIN_INTERVAL_SECONDS, remainingMs / 1000).toFixed(1);
  }

  const seconds = Math.ceil(remainingMs / 1000);
  if (seconds < 1000) {
    return String(seconds);
  }
  const minutes = Math.ceil(seconds / 60);
  if (minutes < 1000) {
    return `${minutes}m`;
  }
  return `${Math.ceil(minutes / 60)}h`;
}

function roundInterval(seconds: number): number {
  return Math.round(seconds * 1000) / 1000;
}
