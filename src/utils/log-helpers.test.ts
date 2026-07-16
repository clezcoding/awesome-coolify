import { describe, expect, it } from 'vitest';
import {
  capLogOutput,
  parseBuildLogEntries,
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
