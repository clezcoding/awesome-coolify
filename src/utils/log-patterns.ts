/**
 * Pure log-line pattern matchers for diagnose.analyze (BRAIN-01).
 * Deterministic rules — no ML, no I/O.
 */

import type { FollowUpHint } from './diagnose-hints.js';

export type LogPatternId =
  | 'oom'
  | 'http_5xx_spike'
  | 'crash_loop'
  | 'connection_refused';

export type LogPatternMatch = {
  id: LogPatternId;
  severity: 'critical' | 'high';
  evidence: string[];
  count: number;
  source?: 'runtime' | 'build';
};

const EVIDENCE_CAP = 3;

const OOM_RE =
  /Out of memory|OOMKilled|Cannot allocate memory|Java heap space|exit code 137|Killed process/i;

/** Status-like 5xx (access-log style or bare status token). */
const HTTP_5XX_RE = /\b5\d{2}\b|HTTP\/1\.[01]"\s*5\d{2}/;

const CRASH_LOOP_RE =
  /Back-off restarting|Restarting container|exit(?:ed)? code [1-9]|panic:|FATAL/i;

const CONNECTION_REFUSED_RE =
  /ECONNREFUSED|connection refused|connect ECONNREFUSED/i;

/** Lines that look like HTTP access/status rows (for spike ratio). */
const STATUS_LIKE_RE = /\b[1-5]\d{2}\b|HTTP\/1\.[01]"\s*[1-5]\d{2}/;

const SPIKE_MIN_COUNT = 5;
const SPIKE_MIN_RATIO = 0.2;
const CRASH_LOOP_MIN = 3;

const PATTERN_NAMES: Record<LogPatternId, string> = {
  oom: 'OOM',
  http_5xx_spike: 'HTTP 5xx spike',
  crash_loop: 'Crash loop',
  connection_refused: 'Connection refused',
};

function capEvidence(lines: string[]): string[] {
  return lines.slice(0, EVIDENCE_CAP);
}

function collectMatches(lines: string[], re: RegExp): string[] {
  return lines.filter((line) => re.test(line));
}

/**
 * Match runtime (or build) log lines against named BRAIN-01 rules.
 */
export function matchLogPatterns(lines: string[]): LogPatternMatch[] {
  const findings: LogPatternMatch[] = [];

  const oomHits = collectMatches(lines, OOM_RE);
  if (oomHits.length > 0) {
    findings.push({
      id: 'oom',
      severity: 'critical',
      evidence: capEvidence(oomHits),
      count: oomHits.length,
    });
  }

  const fiveXxHits = collectMatches(lines, HTTP_5XX_RE);
  const statusLike = collectMatches(lines, STATUS_LIKE_RE);
  const spikeByCount = fiveXxHits.length >= SPIKE_MIN_COUNT;
  const spikeByRatio =
    statusLike.length >= SPIKE_MIN_COUNT &&
    fiveXxHits.length / statusLike.length >= SPIKE_MIN_RATIO &&
    fiveXxHits.length >= SPIKE_MIN_COUNT;
  // Min count ≥5 — single noisy 5xx must not match (Pitfall 1).
  if (spikeByCount || spikeByRatio) {
    findings.push({
      id: 'http_5xx_spike',
      severity: 'high',
      evidence: capEvidence(fiveXxHits),
      count: fiveXxHits.length,
    });
  }

  const crashHits = collectMatches(lines, CRASH_LOOP_RE);
  const repeatCounts = new Map<string, number>();
  for (const line of lines) {
    const key = line.trim();
    if (!key) continue;
    repeatCounts.set(key, (repeatCounts.get(key) ?? 0) + 1);
  }
  const maxRepeat = Math.max(0, ...repeatCounts.values());
  const crashByRepeat = maxRepeat >= CRASH_LOOP_MIN;
  if (crashHits.length >= CRASH_LOOP_MIN || crashByRepeat) {
    const evidenceSrc =
      crashHits.length >= CRASH_LOOP_MIN
        ? crashHits
        : [...repeatCounts.entries()]
            .filter(([, n]) => n >= CRASH_LOOP_MIN)
            .flatMap(([line, n]) => Array(Math.min(n, EVIDENCE_CAP)).fill(line));
    findings.push({
      id: 'crash_loop',
      severity: 'high',
      evidence: capEvidence(evidenceSrc),
      count: Math.max(crashHits.length, maxRepeat),
    });
  }

  const refusedHits = collectMatches(lines, CONNECTION_REFUSED_RE);
  if (refusedHits.length > 0) {
    findings.push({
      id: 'connection_refused',
      severity: 'high',
      evidence: capEvidence(refusedHits),
      count: refusedHits.length,
    });
  }

  return findings;
}

export function patternDisplayName(id: LogPatternId): string {
  return PATTERN_NAMES[id];
}

/**
 * Map pattern IDs → FollowUpHint (diagnose flows + playbook prompt names).
 */
export function enrichPatternHints(
  findings: LogPatternMatch[],
  appUuid: string,
): Array<LogPatternMatch & { name: string; hint: FollowUpHint }> {
  return findings.map((finding) => ({
    ...finding,
    name: PATTERN_NAMES[finding.id],
    hint: hintForPattern(finding.id, appUuid),
  }));
}

function hintForPattern(id: LogPatternId, appUuid: string): FollowUpHint {
  switch (id) {
    case 'oom':
      return {
        tool: 'diagnose',
        action: 'logs',
        args: { uuid: appUuid, mode: 'logs-only', lines: 100 },
        label: 'Inspect runtime logs; follow prompt incident for triage',
        available_in_phase: 26,
      };
    case 'http_5xx_spike':
      return {
        tool: 'diagnose',
        action: 'app',
        args: { uuid: appUuid },
        label: 'Diagnose app health; use prompt incident for 5xx response',
        available_in_phase: 26,
      };
    case 'crash_loop':
      return {
        tool: 'diagnose',
        action: 'logs',
        args: { uuid: appUuid, mode: 'full', lines: 200 },
        label: 'Full diagnose + logs; consider prompt rollback after preflight',
        available_in_phase: 26,
      };
    case 'connection_refused':
      return {
        tool: 'diagnose',
        action: 'app',
        args: { uuid: appUuid },
        label: 'Diagnose app deps; prompt incident if outage persists',
        available_in_phase: 26,
      };
  }
}

/**
 * Dedupe FollowUpHint list by tool+action+label key.
 */
export function dedupeHints(hints: FollowUpHint[]): FollowUpHint[] {
  const seen = new Set<string>();
  const out: FollowUpHint[] = [];
  for (const h of hints) {
    const key = `${h.tool}|${h.action}|${h.label}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(h);
  }
  return out;
}
