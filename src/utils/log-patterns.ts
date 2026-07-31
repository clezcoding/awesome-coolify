/**
 * Pure log-line pattern matchers for diagnose.analyze (BRAIN-01).
 * Wave 0 shell — Wave 1 (31-01) implements regex bodies.
 */

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
};

/**
 * Match runtime log lines against named BRAIN-01 rules.
 * Wave 0: returns [] so tests import cleanly; real matchers land in 31-01.
 */
export function matchLogPatterns(_lines: string[]): LogPatternMatch[] {
  return [];
}
