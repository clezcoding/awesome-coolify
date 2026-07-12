export interface FollowUpHint {
  tool: string;
  action: string;
  args: Record<string, unknown>;
  label: string;
  available_in_phase: number;
}

export type HintResourceType = 'application' | 'database' | 'service' | 'server';

function statusStartsWith(value: string, prefix: string): boolean {
  return value.startsWith(prefix);
}

function statusIncludes(value: string, substring: string): boolean {
  return value.includes(substring);
}

function isUnhealthy(status: string, health?: string): boolean {
  return statusIncludes(status, 'unhealthy') || health === 'unhealthy';
}

function isStopped(status: string): boolean {
  return (
    statusStartsWith(status, 'exited') ||
    statusStartsWith(status, 'stopped')
  );
}

export function generateHints(
  type: HintResourceType,
  uuid: string,
  status: string,
  health?: string,
): FollowUpHint[] {
  const hints: FollowUpHint[] = [];

  switch (type) {
    case 'application': {
      if (isUnhealthy(status, health)) {
        hints.push(
          {
            tool: 'application',
            action: 'restart',
            args: { uuid },
            label: 'Restart application',
            available_in_phase: 4,
          },
          {
            tool: 'application',
            action: 'logs',
            args: { uuid, lines: 100 },
            label: 'Inspect build logs',
            available_in_phase: 5,
          },
          {
            tool: 'application',
            action: 'deploy',
            args: { uuid, force: true },
            label: 'Force redeploy application',
            available_in_phase: 4,
          },
        );
      } else if (isStopped(status)) {
        hints.push({
          tool: 'application',
          action: 'start',
          args: { uuid },
          label: 'Start application',
          available_in_phase: 4,
        });
      }
      break;
    }
    case 'server': {
      if (status === 'unreachable') {
        hints.push({
          tool: 'diagnose',
          action: 'server',
          args: { uuid },
          label: 'Re-run server diagnose with validation',
          available_in_phase: 3,
        });
      }
      break;
    }
    case 'database': {
      if (isUnhealthy(status, health)) {
        hints.push({
          tool: 'database',
          action: 'restart',
          args: { uuid },
          label: 'Restart database',
          available_in_phase: 5,
        });
      } else if (isStopped(status)) {
        hints.push({
          tool: 'database',
          action: 'start',
          args: { uuid },
          label: 'Start database',
          available_in_phase: 5,
        });
      }
      break;
    }
    case 'service': {
      if (isUnhealthy(status, health)) {
        hints.push({
          tool: 'service',
          action: 'restart',
          args: { uuid },
          label: 'Restart service',
          available_in_phase: 5,
        });
      } else if (isStopped(status)) {
        hints.push({
          tool: 'service',
          action: 'start',
          args: { uuid },
          label: 'Start service',
          available_in_phase: 5,
        });
      }
      break;
    }
  }

  return hints;
}
