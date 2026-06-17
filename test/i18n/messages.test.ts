import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FALLBACK_MESSAGES } from '../../src/lib/i18n/messages';

const localesDir = join(process.cwd(), 'assets/extension/_locales');
const expectedKeys = Object.keys(FALLBACK_MESSAGES).sort();

describe('extension locale messages', () => {
  it('keeps fallback keys covered by every browser locale', async () => {
    const locales = await readdir(localesDir);
    expect(locales.length).toBeGreaterThan(1);

    for (const locale of locales) {
      const messages = JSON.parse(await readFile(join(localesDir, locale, 'messages.json'), 'utf8'));
      expect(Object.keys(messages).sort(), locale).toEqual(expectedKeys);
      for (const key of expectedKeys) {
        expect(messages[key]?.message, `${locale}.${key}`).toEqual(expect.any(String));
        expect(messages[key].message.length, `${locale}.${key}`).toBeGreaterThan(0);
      }
    }
  });
});
