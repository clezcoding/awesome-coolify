import { truncateAndGuard } from './formatters.js';

export type BuildLogEntry = {
  command: string | null;
  output: string;
  type: 'stdout' | 'stderr';
  timestamp: string;
  hidden: boolean;
  batch: number;
};

// Semantics: skip first `offset` lines, then return the LAST `lines` lines of the remainder (tail-of-tail).
export function sliceLogBlob(
  logs: string,
  lines: number,
  offset: number,
): string[] {
  if (!logs) {
    return [];
  }

  let split = logs.split('\n');
  if (split.length > 0 && split[split.length - 1] === '') {
    split = split.slice(0, -1);
  }

  const afterOffset = split.slice(offset);
  if (afterOffset.length <= lines) {
    return afterOffset;
  }

  return afterOffset.slice(afterOffset.length - lines);
}

export function capLogOutput(
  logs: string,
  max_chars: number,
): { text: string; truncated: boolean } {
  const result = truncateAndGuard(logs, max_chars);
  return { text: result.text, truncated: result.truncated };
}

export function parseBuildLogEntries(logs: string): {
  parsed: boolean;
  entries: BuildLogEntry[];
} {
  try {
    const result = JSON.parse(logs) as unknown;
    if (!Array.isArray(result)) {
      return { parsed: false, entries: [] };
    }
    return { parsed: true, entries: result as BuildLogEntry[] };
  } catch {
    return { parsed: false, entries: [] };
  }
}
