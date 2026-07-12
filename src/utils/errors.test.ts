import { describe, expect, it } from 'vitest';
import {
  mapApiError,
  toStructuredError,
  wrapMcpError,
  CoolifyApiError,
} from './errors.js';

describe('mapApiError', () => {
  it('maps HTTP 401 to COOLIFY_401 with recoveryHints', () => {
    const envelope = mapApiError(null, 401);
    expect(envelope.code).toBe('COOLIFY_401');
    expect(envelope.httpStatus).toBe(401);
    expect(envelope.recoveryHints.length).toBeGreaterThanOrEqual(1);
    expect(envelope.recoveryHints[0]).toMatch(/Keys & Tokens/i);
  });

  it('maps HTTP 404 to COOLIFY_404', () => {
    expect(mapApiError(null, 404).code).toBe('COOLIFY_404');
  });

  it('maps HTTP 422 to COOLIFY_422', () => {
    expect(mapApiError(null, 422).code).toBe('COOLIFY_422');
  });

  it('maps HTTP 500 to COOLIFY_500', () => {
    expect(mapApiError(null, 500).code).toBe('COOLIFY_500');
  });

  it('maps ECONNREFUSED to COOLIFY_NETWORK', () => {
    const err = Object.assign(new Error('connect refused'), {
      code: 'ECONNREFUSED',
    });
    expect(mapApiError(err).code).toBe('COOLIFY_NETWORK');
  });

  it('maps AbortError to COOLIFY_TIMEOUT', () => {
    const err = new Error('aborted');
    err.name = 'AbortError';
    expect(mapApiError(err).code).toBe('COOLIFY_TIMEOUT');
  });
});

describe('wrapMcpError', () => {
  it('returns isError true with parseable JSON content containing code', () => {
    const result = wrapMcpError(new CoolifyApiError(mapApiError(null, 401)));
    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text) as { code: string };
    expect(parsed.code).toBe('COOLIFY_401');
  });

  it('never includes Authorization header value in output', () => {
    const secret = 'super-secret-bearer-token-abc123';
    const err = new Error(`Request failed Authorization: Bearer ${secret}`);
    const envelope = toStructuredError(err);
    const result = wrapMcpError(envelope);
    const text = result.content[0].text;
    expect(text).not.toContain(secret);
    expect(envelope.message).not.toContain(secret);
  });
});
