import { describe, expect, it } from 'vitest';

describe('parseEnvFile', () => {
  it('parses KEY=value, comments, and empty values', async () => {
    const { parseEnvFile } = await import('./env-parser.js');
    const result = parseEnvFile('KEY=value\n# comment\nEMPTY=');
    expect(result).toEqual([
      { key: 'KEY', value: 'value' },
      { key: 'EMPTY', value: '' },
    ]);
  });

  it('strips surrounding single and double quotes from values', async () => {
    const { parseEnvFile } = await import('./env-parser.js');
    const result = parseEnvFile("SINGLE='quoted'\nDOUBLE=\"quoted\"");
    expect(result).toEqual([
      { key: 'SINGLE', value: 'quoted' },
      { key: 'DOUBLE', value: 'quoted' },
    ]);
  });

  it('unescapes \\n inside double-quoted multiline values', async () => {
    const { parseEnvFile } = await import('./env-parser.js');
    const result = parseEnvFile('MULTI="line1\\nline2"');
    expect(result).toEqual([{ key: 'MULTI', value: 'line1\nline2' }]);
  });

  it('ignores blank lines and hash comments', async () => {
    const { parseEnvFile } = await import('./env-parser.js');
    const result = parseEnvFile('\n\n# full line comment\n\nKEY=ok\n');
    expect(result).toEqual([{ key: 'KEY', value: 'ok' }]);
  });

  it('preserves leading and trailing whitespace inside double quotes', async () => {
    const { parseEnvFile } = await import('./env-parser.js');
    const result = parseEnvFile('SPACED="  padded  "');
    expect(result).toEqual([{ key: 'SPACED', value: '  padded  ' }]);
  });
});

describe('diffEnvs', () => {
  it('returns added, updated, unchanged, removed buckets by key', async () => {
    const { diffEnvs } = await import('./env-parser.js');
    const local = [
      { key: 'NEW', value: '1' },
      { key: 'SAME', value: 'same' },
      { key: 'CHANGED', value: 'local' },
    ];
    const remote = [
      { key: 'SAME', value: 'same' },
      { key: 'CHANGED', value: 'remote' },
      { key: 'OLD', value: 'gone' },
    ];

    const result = diffEnvs(local, remote);
    expect(result.added).toEqual([{ key: 'NEW', value: '1' }]);
    expect(result.updated).toEqual([
      expect.objectContaining({ key: 'CHANGED', localValue: 'local', remoteValue: 'remote' }),
    ]);
    expect(result.unchanged).toEqual([{ key: 'SAME', value: 'same' }]);
    expect(result.removed).toEqual([{ key: 'OLD', value: 'gone' }]);
  });

  it('marks updated only when local value differs from remote', async () => {
    const { diffEnvs } = await import('./env-parser.js');
    const result = diffEnvs(
      [{ key: 'A', value: 'x' }],
      [{ key: 'A', value: 'x' }],
    );
    expect(result.updated).toEqual([]);
    expect(result.unchanged).toEqual([{ key: 'A', value: 'x' }]);
  });
});

describe('detectConflicts', () => {
  const local = [{ key: 'SHARED', value: 'local-value' }];
  const remote = [{ key: 'SHARED', value: 'remote-value' }];
  const baseline = [{ key: 'SHARED', value: 'baseline-value' }];

  it("policy 'overwrite' returns empty conflicts for caller clobber", async () => {
    const { detectConflicts } = await import('./env-parser.js');
    const result = detectConflicts(local, remote, baseline, 'overwrite');
    expect(result.conflicts).toEqual([]);
  });

  it("policy 'keep_remote' returns keep-remote decisions without throw", async () => {
    const { detectConflicts } = await import('./env-parser.js');
    const result = detectConflicts(local, remote, baseline, 'keep_remote');
    expect(result.decisions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'SHARED', action: 'keep_remote' }),
      ]),
    );
  });

  it("policy 'abort' returns abort decisions without throw", async () => {
    const { detectConflicts } = await import('./env-parser.js');
    const result = detectConflicts(local, remote, baseline, 'abort');
    expect(result.decisions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'SHARED', action: 'abort' }),
      ]),
    );
  });

  it('detects out-of-band remote edits since local snapshot', async () => {
    const { detectConflicts } = await import('./env-parser.js');
    const result = detectConflicts(local, remote, baseline, 'keep_remote');
    expect(result.conflicts.length).toBeGreaterThan(0);
    expect(result.conflicts[0]).toMatchObject({ key: 'SHARED' });
  });
});
