import { truncateAndGuard } from './formatters.js';
import {
  CoolifyApiError,
  RECOVERY_HINTS,
} from './errors.js';

export type BuildLogEntry = {
  command: string | null;
  output: string;
  type: 'stdout' | 'stderr';
  timestamp: string;
  hidden: boolean;
  batch: number;
};

export type DeploymentBuildLogParams = {
  lines: number;
  offset: number;
  include_hidden: boolean;
  type: 'stdout' | 'stderr' | 'all';
  max_chars: number;
};

export type DeploymentBuildLogResult = {
  deployment_uuid: string;
  status: string;
  logs_lines: string[];
  logs_truncated: boolean;
  total_lines: number;
  entries_total: number;
  entries_hidden: number;
  entries_shown: number;
  hint?: string;
};

const EMPTY_LOGS_HINT =
  'Deployment exists but build logs are empty — build may still be running or logs were not retained.';

export const EMPTY_RUNTIME_LOGS_HINT =
  'Application exists but runtime logs are empty — container may be idle or logs not yet available.';

export function buildRuntimeLogPayload(
  uuid: string,
  logsStr: string,
  params: { lines: number; offset: number; max_chars: number },
) {
  const allLines = sliceLogBlob(logsStr, params.lines, params.offset);
  const capped = capLogOutput(allLines.join('\n'), params.max_chars);
  const cappedLines = capped.text.split('\n').filter((l) => l.length > 0);
  return {
    uuid,
    logs_lines: cappedLines,
    logs_truncated: capped.truncated,
    total_lines: allLines.length,
  };
}

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

export function processDeploymentBuildLogs(
  deploymentUuid: string,
  rec: Record<string, unknown>,
  params: DeploymentBuildLogParams,
): DeploymentBuildLogResult {
  if (typeof rec.logs !== 'string') {
    throw new CoolifyApiError({
      code: 'COOLIFY_403_SENSITIVE_REQUIRED',
      message:
        'Deployment build logs are not available — the API token lacks the api.sensitive ability required to read deployment logs.',
      recoveryHints: RECOVERY_HINTS.COOLIFY_403_SENSITIVE_REQUIRED,
    });
  }

  const status = String(rec.status ?? 'unknown');

  if (rec.logs.length === 0) {
    return {
      deployment_uuid: deploymentUuid,
      status,
      logs_lines: [],
      logs_truncated: false,
      total_lines: 0,
      entries_total: 0,
      entries_hidden: 0,
      entries_shown: 0,
      hint: EMPTY_LOGS_HINT,
    };
  }

  const { lines, offset, include_hidden: includeHidden, type: logType, max_chars } =
    params;
  const { parsed: parsedOk, entries } = parseBuildLogEntries(rec.logs);

  if (!parsedOk) {
    const allLines = sliceLogBlob(rec.logs, lines, offset);
    const capped = capLogOutput(allLines.join('\n'), max_chars);
    const cappedLines = capped.text.split('\n').filter((l) => l.length > 0);

    return {
      deployment_uuid: deploymentUuid,
      status,
      logs_lines: cappedLines,
      logs_truncated: capped.truncated,
      total_lines: allLines.length,
      entries_total: allLines.length,
      entries_hidden: 0,
      entries_shown: cappedLines.length,
    };
  }

  const visibleEntries = entries.filter(
    (e) =>
      (includeHidden ? true : !e.hidden) &&
      (logType === 'all' ? true : e.type === logType),
  );
  const entriesHidden = entries.filter((e) => e.hidden).length;
  const flattened = visibleEntries.map((e) => e.output).join('\n');
  const allLines = sliceLogBlob(flattened, lines, offset);
  const capped = capLogOutput(allLines.join('\n'), max_chars);
  const cappedLines = capped.text.split('\n').filter((l) => l.length > 0);

  return {
    deployment_uuid: deploymentUuid,
    status,
    logs_lines: cappedLines,
    logs_truncated: capped.truncated,
    total_lines: allLines.length,
    entries_total: entries.length,
    entries_hidden: entriesHidden,
    entries_shown: cappedLines.length,
  };
}
