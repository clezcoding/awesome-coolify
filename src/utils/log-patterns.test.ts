import { describe, expect, it } from 'vitest';
import { matchLogPatterns } from './log-patterns.js';

describe('matchLogPatterns', () => {
  it('returns empty array for empty input', () => {
    expect(matchLogPatterns([])).toEqual([]);
  });

  it('empty-noise lines alone produce no fabricated matches', () => {
    expect(
      matchLogPatterns([
        'info: server started',
        'GET /health 200',
        'debug: idle',
      ]),
    ).toEqual([]);
  });

  describe('oom', () => {
    it.fails(
      'detects oom with severity critical and capped evidence (BRAIN-01)',
      () => {
        const lines = [
          'worker: Out of memory: Kill process 42',
          'container OOMKilled',
          'Java heap space',
          'noise',
          'Cannot allocate memory',
        ];
        const matches = matchLogPatterns(lines);
        const oom = matches.find((m) => m.id === 'oom');
        expect(oom).toBeDefined();
        expect(oom?.severity).toBe('critical');
        expect(oom?.evidence.length).toBeGreaterThan(0);
        expect(oom?.evidence.length).toBeLessThanOrEqual(3);
        expect(oom?.count).toBeGreaterThanOrEqual(1);
      },
    );
  });

  describe('http_5xx_spike', () => {
    it.fails(
      'detects ≥5 status-like 5xx lines as http_5xx_spike high (BRAIN-01)',
      () => {
        const lines = [
          'GET /api 500',
          'POST /x HTTP/1.1" 502',
          'GET /y 503',
          'GET /z 504',
          'GET /w 500',
          'ok 200',
        ];
        const matches = matchLogPatterns(lines);
        const spike = matches.find((m) => m.id === 'http_5xx_spike');
        expect(spike).toBeDefined();
        expect(spike?.severity).toBe('high');
        expect(spike?.count).toBeGreaterThanOrEqual(5);
        expect(spike?.evidence.length).toBeLessThanOrEqual(3);
      },
    );
  });

  describe('crash_loop', () => {
    it.fails(
      'detects ≥3 restart/fatal lines as crash_loop high (BRAIN-01)',
      () => {
        const lines = [
          'Back-off restarting failed container',
          'Restarting container app-1',
          'FATAL: worker crashed',
          'info: heartbeat',
        ];
        const matches = matchLogPatterns(lines);
        const crash = matches.find((m) => m.id === 'crash_loop');
        expect(crash).toBeDefined();
        expect(crash?.severity).toBe('high');
        expect(crash?.count).toBeGreaterThanOrEqual(3);
        expect(crash?.evidence.length).toBeLessThanOrEqual(3);
      },
    );
  });

  describe('connection_refused', () => {
    it.fails(
      'detects connection_refused with severity high (BRAIN-01)',
      () => {
        const lines = [
          'Error: connect ECONNREFUSED 127.0.0.1:5432',
          'db: connection refused',
        ];
        const matches = matchLogPatterns(lines);
        const refused = matches.find((m) => m.id === 'connection_refused');
        expect(refused).toBeDefined();
        expect(refused?.severity).toBe('high');
        expect(refused?.evidence.length).toBeGreaterThan(0);
        expect(refused?.evidence.length).toBeLessThanOrEqual(3);
      },
    );
  });
});
