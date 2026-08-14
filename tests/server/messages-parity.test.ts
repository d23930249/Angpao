// @vitest-environment node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

type MessageTree = { [key: string]: string | MessageTree };

function loadMessages(locale: string): MessageTree {
  return JSON.parse(readFileSync(join(process.cwd(), 'messages', `${locale}.json`), 'utf8'));
}

const en = loadMessages('en');
const vi = loadMessages('vi');

function flattenKeys(tree: MessageTree, prefix = ''): string[] {
  return Object.entries(tree).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === 'string' ? [path] : flattenKeys(value, path);
  });
}

const englishKeys = flattenKeys(en);
const vietnameseKeys = new Set(flattenKeys(vi));

describe('translation coverage', () => {
  it('translates every English message into Vietnamese', () => {
    const untranslated = englishKeys.filter((key) => !vietnameseKeys.has(key));
    expect(untranslated).toEqual([]);
  });

  it('keeps the placeholders of a message identical across locales', () => {
    const placeholdersOf = (value: string) => (value.match(/\{[a-zA-Z0-9_]+\}/g) ?? []).sort();
    const read = (tree: MessageTree, key: string): string =>
      key.split('.').reduce<string | MessageTree>((node, part) => (node as MessageTree)[part], tree) as string;

    const mismatched = englishKeys
      .filter((key) => vietnameseKeys.has(key))
      .filter(
        (key) =>
          placeholdersOf(read(en, key)).join() !==
          placeholdersOf(read(vi, key)).join(),
      );

    expect(mismatched).toEqual([]);
  });
});
