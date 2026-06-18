import { describe, expect, it } from 'vitest';
import {
  DEFAULT_OPTIONS,
  MAX_REFRESHES,
  MAX_STOP_AFTER_MINUTES,
  hasNonDefaultOptions,
  sanitizeOptions
} from '../../src/lib/refresh/options';

describe('refresh options', () => {
  it('falls back to defaults for non-object or empty input', () => {
    expect(sanitizeOptions(undefined)).toEqual(DEFAULT_OPTIONS);
    expect(sanitizeOptions(null)).toEqual(DEFAULT_OPTIONS);
    expect(sanitizeOptions('nope')).toEqual(DEFAULT_OPTIONS);
    expect(sanitizeOptions({})).toEqual(DEFAULT_OPTIONS);
  });

  it('coerces booleans strictly', () => {
    expect(sanitizeOptions({ bypassCache: 'yes', refreshImmediately: 1 })).toMatchObject({
      bypassCache: false,
      refreshImmediately: false
    });
    expect(sanitizeOptions({ bypassCache: true, refreshImmediately: true })).toMatchObject({
      bypassCache: true,
      refreshImmediately: true
    });
  });

  it('floors and clamps the refresh count, treating under 1 as unlimited', () => {
    expect(sanitizeOptions({ maxRefreshes: 0 }).maxRefreshes).toBeNull();
    expect(sanitizeOptions({ maxRefreshes: -5 }).maxRefreshes).toBeNull();
    expect(sanitizeOptions({ maxRefreshes: 'abc' }).maxRefreshes).toBeNull();
    expect(sanitizeOptions({ maxRefreshes: 3.9 }).maxRefreshes).toBe(3);
    expect(sanitizeOptions({ maxRefreshes: '10' }).maxRefreshes).toBe(10);
    expect(sanitizeOptions({ maxRefreshes: 1e9 }).maxRefreshes).toBe(MAX_REFRESHES);
  });

  it('clamps the stop-after duration, treating zero or less as no limit', () => {
    expect(sanitizeOptions({ stopAfterMinutes: 0 }).stopAfterMinutes).toBeNull();
    expect(sanitizeOptions({ stopAfterMinutes: -1 }).stopAfterMinutes).toBeNull();
    expect(sanitizeOptions({ stopAfterMinutes: 1.5 }).stopAfterMinutes).toBe(1.5);
    expect(sanitizeOptions({ stopAfterMinutes: 1e6 }).stopAfterMinutes).toBe(MAX_STOP_AFTER_MINUTES);
  });

  it('detects non-default options', () => {
    expect(hasNonDefaultOptions(DEFAULT_OPTIONS)).toBe(false);
    expect(hasNonDefaultOptions(sanitizeOptions({ bypassCache: true }))).toBe(true);
    expect(hasNonDefaultOptions(sanitizeOptions({ maxRefreshes: 5 }))).toBe(true);
    expect(hasNonDefaultOptions(sanitizeOptions({ stopAfterMinutes: 30 }))).toBe(true);
  });
});
