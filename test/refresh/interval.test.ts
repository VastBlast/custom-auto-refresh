import { describe, expect, it } from 'vitest';
import {
  DEFAULT_INTERVAL_SECONDS,
  MAX_INTERVAL_SECONDS,
  MIN_INTERVAL_SECONDS,
  formatBadgeText,
  formatIntervalSeconds,
  formatRemaining,
  normalizeIntervalSeconds
} from '../../src/lib/refresh/interval';

describe('refresh intervals', () => {
  it('normalizes invalid and out-of-range input', () => {
    expect(normalizeIntervalSeconds('')).toBe(DEFAULT_INTERVAL_SECONDS);
    expect(normalizeIntervalSeconds('abc')).toBe(DEFAULT_INTERVAL_SECONDS);
    expect(normalizeIntervalSeconds('0')).toBe(MIN_INTERVAL_SECONDS);
    expect(normalizeIntervalSeconds('999999999')).toBe(MAX_INTERVAL_SECONDS);
  });

  it('rounds intervals to browser-friendly precision', () => {
    expect(normalizeIntervalSeconds('1.236')).toBe(1.24);
    expect(formatIntervalSeconds(1.5)).toBe('1.5');
    expect(formatIntervalSeconds(10)).toBe('10');
  });

  it('formats popup and badge countdowns', () => {
    expect(formatRemaining(null)).toBe('--');
    expect(formatRemaining(0)).toBe('0s');
    expect(formatRemaining(900)).toBe('0.9s');
    expect(formatRemaining(61000)).toBe('1m 1s');
    expect(formatBadgeText(900, 500)).toBe('0.9');
    expect(formatBadgeText(0, 0)).toBe('0');
    expect(formatBadgeText(12000, 15000)).toBe('12');
    expect(formatBadgeText(7200000, 7200000)).toBe('120m');
  });
});
