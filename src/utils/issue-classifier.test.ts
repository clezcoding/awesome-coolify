import { describe, expect, it } from 'vitest';
import { classifyIssues, type ScanIssue } from './issue-classifier.js';
import {
  mockMixedServers,
  mockMixedResources,
} from '../../tests/fixtures/coolify-mixed-health.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

describe('classifyIssues', () => {
  it('returns empty buckets for empty input', () => {
    expect(classifyIssues([], [])).toEqual({
      critical: [],
      high: [],
      info: [],
    });
  });

  it('classifies unreachable server as critical', () => {
    const servers = [
      {
        uuid: 'srv-offline',
        name: 'n',
        ip: '1.2.3.4',
        settings: { is_reachable: false },
      },
    ];
    const result = classifyIssues(servers, []);
    expect(result.critical.length).toBe(1);
    expect(result.critical[0].resource_type).toBe('server');
    expect(result.critical[0].status).toBe('unreachable');
  });

  it('classifies unhealthy resource as high', () => {
    const resources = [
      { uuid: 'a', name: 'n', type: 'application', status: 'unhealthy' },
    ];
    const result = classifyIssues([], resources);
    expect(result.high.length).toBe(1);
    expect(result.high[0].resource_type).toBe('application');
  });

  it('classifies stopped database as info not high', () => {
    const resources = [
      { uuid: 'd', name: 'n', type: 'database', status: 'exited:0' },
    ];
    const result = classifyIssues([], resources);
    expect(result.info.length).toBe(1);
    expect(result.high.length).toBe(0);
    expect(result.info[0].resource_type).toBe('database');
  });

  it('classifies standalone-postgresql as database resource type', () => {
    const resources = [
      {
        uuid: 'd',
        name: 'n',
        type: 'standalone-postgresql',
        status: 'exited:0',
      },
    ];
    const result = classifyIssues([], resources);
    expect(result.info.length).toBe(1);
    expect(result.info[0].resource_type).toBe('database');
  });

  it('attaches structured hint objects to each issue', () => {
    const resources = [
      { uuid: 'a', name: 'n', type: 'application', status: 'unhealthy' },
    ];
    const result = classifyIssues([], resources);
    const hint = result.high[0].hint;
    expect(hint).toHaveProperty('tool');
    expect(hint).toHaveProperty('action');
    expect(hint).toHaveProperty('args');
    expect(hint).toHaveProperty('label');
    expect(hint).toHaveProperty('available_in_phase');
  });

  describe('property-based invariants', () => {
    const serverPermutations = mockMixedServers.filter(isRecord);
    const resourcePermutations = mockMixedResources.filter(isRecord);

    it('every unreachable server maps to critical', () => {
      for (const server of serverPermutations) {
        const reachable = (server.settings as { is_reachable?: boolean } | undefined)
          ?.is_reachable;
        if (reachable === false) {
          const result = classifyIssues([server], []);
          expect(result.critical.some((i) => i.uuid === String(server.uuid))).toBe(
            true,
          );
        }
      }
    });

    it('every unhealthy resource maps to high', () => {
      for (const resource of resourcePermutations) {
        const status = String(resource.status ?? '');
        if (status.includes('unhealthy')) {
          const result = classifyIssues([], [resource]);
          expect(result.high.some((i) => i.uuid === String(resource.uuid))).toBe(
            true,
          );
        }
      }
    });

    it('every stopped/exited resource maps to info not high', () => {
      for (const resource of resourcePermutations) {
        const status = String(resource.status ?? '');
        if (status.startsWith('exited') || status.startsWith('stopped')) {
          const result = classifyIssues([], [resource]);
          expect(result.info.some((i) => i.uuid === String(resource.uuid))).toBe(
            true,
          );
          expect(result.high.some((i) => i.uuid === String(resource.uuid))).toBe(
            false,
          );
        }
      }
    });

    it('classifies mixed-health fixture with expected bucket counts', () => {
      const result = classifyIssues(serverPermutations, resourcePermutations);
      expect(result.critical.length).toBeGreaterThanOrEqual(1);
      expect(result.high.length).toBeGreaterThanOrEqual(1);
      expect(result.info.length).toBeGreaterThanOrEqual(1);
      for (const issue of [
        ...result.critical,
        ...result.high,
        ...result.info,
      ] as ScanIssue[]) {
        expect(typeof issue.hint).toBe('object');
      }
    });
  });
});
