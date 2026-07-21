export interface ParsedEnv {
  key: string;
  value: string;
  raw?: string;
}

export interface Env {
  uuid?: string;
  key: string;
  value: string;
  is_preview?: boolean;
  is_literal?: boolean;
  is_multiline?: boolean;
  is_shown_once?: boolean;
}

export interface DiffResult {
  added: ParsedEnv[];
  updated: Array<{
    key: string;
    localValue: string;
    remoteValue: string;
  }>;
  unchanged: ParsedEnv[];
  removed: Env[];
}

export interface Conflict {
  key: string;
  remote_masked: string;
  local_present: boolean;
}

export type ConflictPolicy = 'overwrite' | 'keep_remote' | 'abort';

export interface ConflictDetectionResult {
  conflicts: Conflict[];
  decisions: Array<{ key: string; action: ConflictPolicy }>;
}

/**
 * Parses `.env` file content into key/value pairs.
 * Soft limit: callers should reject inputs over ~1 MiB before invoking.
 */
export function parseEnvFile(content: string): ParsedEnv[] {
  const result: ParsedEnv[] = [];
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const eqIndex = line.indexOf('=');
    if (eqIndex === -1) {
      continue;
    }

    let keyPart = line.slice(0, eqIndex).trim();
    if (keyPart.startsWith('export ')) {
      keyPart = keyPart.slice('export '.length).trim();
    }
    const key = keyPart;
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
      continue;
    }
    let rawValue = line.slice(eqIndex + 1);
    let value = rawValue;

    if (
      rawValue.length >= 2 &&
      rawValue.startsWith("'") &&
      rawValue.endsWith("'")
    ) {
      value = rawValue.slice(1, -1);
    } else if (
      rawValue.length >= 2 &&
      rawValue.startsWith('"') &&
      rawValue.endsWith('"')
    ) {
      const inner = rawValue.slice(1, -1);
      value = unescapeDoubleQuoted(inner);
    } else {
      value = rawValue.trim();
    }

    result.push({ key, value });
  }

  return result;
}

function unescapeDoubleQuoted(value: string): string {
  let result = '';
  for (let i = 0; i < value.length; i++) {
    if (value[i] === '\\' && i + 1 < value.length) {
      const next = value[i + 1];
      if (next === 'n') {
        result += '\n';
        i++;
        continue;
      }
      if (next === '"') {
        result += '"';
        i++;
        continue;
      }
      if (next === '\\') {
        result += '\\';
        i++;
        continue;
      }
    }
    result += value[i];
  }
  return result;
}

export function diffEnvs(local: ParsedEnv[], remote: Env[]): DiffResult {
  const remoteByKey = new Map(remote.map((entry) => [entry.key, entry]));
  const localKeys = new Set(local.map((entry) => entry.key));

  const added: ParsedEnv[] = [];
  const updated: DiffResult['updated'] = [];
  const unchanged: ParsedEnv[] = [];
  const removed: Env[] = [];

  for (const entry of local) {
    const remoteEntry = remoteByKey.get(entry.key);
    if (!remoteEntry) {
      added.push(entry);
      continue;
    }
    if (entry.value !== remoteEntry.value) {
      updated.push({
        key: entry.key,
        localValue: entry.value,
        remoteValue: remoteEntry.value,
      });
    } else {
      unchanged.push({ key: entry.key, value: entry.value });
    }
  }

  for (const entry of remote) {
    if (!localKeys.has(entry.key)) {
      removed.push(entry);
    }
  }

  return { added, updated, unchanged, removed };
}

/**
 * Detects out-of-band remote edits since sync baseline.
 * Baseline is the remote snapshot captured at sync start; current remote may
 * have diverged if another actor changed values before apply.
 */
export function detectConflicts(
  local: ParsedEnv[],
  remote: Env[],
  baseline: Env[],
  policy: ConflictPolicy,
): ConflictDetectionResult {
  if (policy === 'overwrite') {
    return { conflicts: [], decisions: [] };
  }

  const remoteByKey = new Map(remote.map((entry) => [entry.key, entry]));
  const baselineByKey = new Map(baseline.map((entry) => [entry.key, entry]));
  const conflicts: Conflict[] = [];
  const decisions: ConflictDetectionResult['decisions'] = [];

  for (const localEntry of local) {
    const remoteEntry = remoteByKey.get(localEntry.key);
    const baselineEntry = baselineByKey.get(localEntry.key);
    if (!remoteEntry || !baselineEntry) {
      continue;
    }

    const outOfBand = remoteEntry.value !== baselineEntry.value;
    const valueDiffers = localEntry.value !== remoteEntry.value;

    if (outOfBand && valueDiffers) {
      conflicts.push({
        key: localEntry.key,
        remote_masked: '***',
        local_present: true,
      });
      decisions.push({ key: localEntry.key, action: policy });
    }
  }

  return { conflicts, decisions };
}
