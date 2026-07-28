/**
 * doc-version-parity — .planning/PROJECT.md opener version alignment (DOC-01).
 * Scope: PROJECT.md only — CHANGELOG and milestone archives excluded per D-09.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = resolve(import.meta.dirname, '../..');
const PROJECT_MD = resolve(ROOT, '.planning/PROJECT.md');

describe('doc version parity', () => {
  it.fails(
    'PROJECT.md opener reflects 1.0.1 shipped state not pending Version Packages (DOC-01, D-07)',
    () => {
      const content = readFileSync(PROJECT_MD, 'utf8');
      const opener = content.split('\n').slice(0, 10).join('\n');
      expect(opener).not.toMatch(/pending Version Packages/i);
      expect(opener).toContain('1.0.1');
    },
  );
});
