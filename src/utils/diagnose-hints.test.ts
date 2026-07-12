import { describe, expect, it } from 'vitest';
import { generateHints, logsAvailableHint, type FollowUpHint } from './diagnose-hints.js';

function findHint(
  hints: FollowUpHint[],
  tool: string,
  action: string,
): FollowUpHint | undefined {
  return hints.find((h) => h.tool === tool && h.action === action);
}

describe('generateHints', () => {
  it('returns restart logs and deploy hints for unhealthy application', () => {
    const hints = generateHints('application', 'uuid-1', 'unhealthy');
    expect(findHint(hints, 'application', 'restart')).toEqual({
      tool: 'application',
      action: 'restart',
      args: { uuid: 'uuid-1' },
      label: 'Restart application',
      available_in_phase: 4,
    });
    expect(findHint(hints, 'application', 'logs')).toEqual({
      tool: 'application',
      action: 'logs',
      args: { uuid: 'uuid-1', lines: 100 },
      label: 'Inspect build logs',
      available_in_phase: 5,
    });
    expect(findHint(hints, 'application', 'deploy')).toEqual({
      tool: 'application',
      action: 'deploy',
      args: { uuid: 'uuid-1', force: true },
      label: 'Force redeploy application',
      available_in_phase: 4,
    });
  });

  it('returns start hint for stopped application', () => {
    const hints = generateHints('application', 'uuid-1', 'stopped');
    expect(findHint(hints, 'application', 'start')).toEqual({
      tool: 'application',
      action: 'start',
      args: { uuid: 'uuid-1' },
      label: 'Start application',
      available_in_phase: 4,
    });
  });

  it('returns diagnose server hint for unreachable server', () => {
    const hints = generateHints('server', 'srv-1', 'unreachable');
    expect(findHint(hints, 'diagnose', 'server')).toEqual({
      tool: 'diagnose',
      action: 'server',
      args: { uuid: 'srv-1' },
      label: 'Re-run server diagnose with validation',
      available_in_phase: 3,
    });
  });

  it('returns start hint for exited database', () => {
    const hints = generateHints('database', 'db-1', 'exited:0');
    expect(findHint(hints, 'database', 'start')).toEqual({
      tool: 'database',
      action: 'start',
      args: { uuid: 'db-1' },
      label: 'Start database',
      available_in_phase: 5,
    });
  });

  it('returns restart hint for unhealthy service', () => {
    const hints = generateHints('service', 'svc-1', 'unhealthy');
    expect(findHint(hints, 'service', 'restart')).toEqual({
      tool: 'service',
      action: 'restart',
      args: { uuid: 'svc-1' },
      label: 'Restart service',
      available_in_phase: 5,
    });
  });

  it('returns structured objects not strings', () => {
    const hints = generateHints('application', 'uuid-1', 'unhealthy');
    for (const hint of hints) {
      expect(typeof hint).toBe('object');
      expect(hint).toHaveProperty('tool');
      expect(hint).toHaveProperty('action');
      expect(hint).toHaveProperty('args');
      expect(hint).toHaveProperty('label');
      expect(hint).toHaveProperty('available_in_phase');
    }
  });
});

describe('logsAvailableHint', () => {
  it('returns D-19 FollowUpHint shape for deployment_uuid', () => {
    const hint = logsAvailableHint('dep-123');
    expect(hint).toEqual({
      tool: 'application',
      action: 'logs',
      args: { deployment_uuid: 'dep-123' },
      label: 'View build logs',
      available_in_phase: 5,
    });
  });

  it('satisfies FollowUpHint interface with no extra keys', () => {
    const hint = logsAvailableHint('dep-uuid-123');
    const keys = Object.keys(hint).sort();
    expect(keys).toEqual([
      'action',
      'args',
      'available_in_phase',
      'label',
      'tool',
    ]);
  });
});
