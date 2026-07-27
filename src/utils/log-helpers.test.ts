import { describe, expect, it } from 'vitest';
import {
  capLogOutput,
  parseBuildLogEntries,
  processDeploymentBuildLogs,
  sliceLogBlob,
} from './log-helpers.js';

describe('sliceLogBlob', () => {
  it('returns last 2 lines with offset 0', () => {
    expect(sliceLogBlob('a\nb\nc\nd', 2, 0)).toEqual(['c', 'd']);
  });

  it('skips offset lines then returns last N of remainder', () => {
    expect(sliceLogBlob('a\nb\nc\nd', 2, 1)).toEqual(['c', 'd']);
  });

  it('returns empty array for empty input', () => {
    expect(sliceLogBlob('', 100, 0)).toEqual([]);
  });
});

describe('capLogOutput', () => {
  it('truncates when text exceeds max_chars', () => {
    const result = capLogOutput('x'.repeat(30000), 20000);
    expect(result.text.length).toBeLessThanOrEqual(20000);
    expect(result.truncated).toBe(true);
  });

  it('returns short text unchanged', () => {
    expect(capLogOutput('short', 20000)).toEqual({
      text: 'short',
      truncated: false,
    });
  });
});

describe('parseBuildLogEntries', () => {
  it('parses JSON array of build log entries', () => {
    const logs =
      '[{"command":null,"output":"line1","type":"stdout","timestamp":"2026-07-13T00:41:12.163071Z","hidden":false,"batch":1},{"command":null,"output":"line2","type":"stderr","timestamp":"2026-07-13T00:41:12.200000Z","hidden":true,"batch":1}]';
    const result = parseBuildLogEntries(logs);
    expect(result.parsed).toBe(true);
    expect(result.entries).toHaveLength(2);
    expect(result.entries[0]).toMatchObject({
      output: 'line1',
      type: 'stdout',
      hidden: false,
    });
    expect(result.entries[1]).toMatchObject({
      output: 'line2',
      type: 'stderr',
      hidden: true,
    });
  });

  it('returns parsed false for invalid JSON without throwing', () => {
    expect(parseBuildLogEntries('not valid json')).toEqual({
      parsed: false,
      entries: [],
    });
  });
});

describe('processDeploymentBuildLogs', () => {
  it('flattens JSON build log entries into logs_lines envelope fields', () => {
    const result = processDeploymentBuildLogs(
      'dep-1',
      {
        status: 'finished',
        logs: JSON.stringify([
          { output: 'visible', type: 'stdout', hidden: false },
          { output: 'hidden', type: 'stdout', hidden: true },
        ]),
      },
      { include_hidden: false, type: 'all', lines: 100, offset: 0, max_chars: 20000 },
    );
    expect(result.logs_lines).toEqual(['visible']);
    expect(result.entries_total).toBe(2);
    expect(result.entries_hidden).toBe(1);
    expect(result.entries_shown).toBe(1);
  });
});
