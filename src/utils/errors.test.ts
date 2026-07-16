import { describe, expect, it } from 'vitest';
import {
  mapApiError,
  toStructuredError,
  wrapMcpError,
  CoolifyApiError,
  RECOVERY_HINTS,
  type CoolifyErrorCode,
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

  it('maps HTTP 400 to COOLIFY_422', () => {
    expect(mapApiError(null, 400).code).toBe('COOLIFY_422');
    expect(mapApiError(null, 400).httpStatus).toBe(400);
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

describe('COOLIFY_403_SENSITIVE_REQUIRED', () => {
  it('is a valid CoolifyErrorCode literal', () => {
    const code: CoolifyErrorCode = 'COOLIFY_403_SENSITIVE_REQUIRED';
    expect(code).toBe('COOLIFY_403_SENSITIVE_REQUIRED');
  });

  it('RECOVERY_HINTS has exactly 2 hints with api.sensitive mention', () => {
    const hints = RECOVERY_HINTS.COOLIFY_403_SENSITIVE_REQUIRED;
    expect(hints).toHaveLength(2);
    expect(hints[0]).toBe(
      'The API token lacks the `api.sensitive` ability required to read deployment build logs.',
    );
    expect(hints[1]).toBe(
      'Regenerate the token in the Coolify UI under Keys & Tokens with the `api.sensitive` scope enabled.',
    );
    expect(hints.some((h) => h.includes('api.sensitive'))).toBe(true);
  });

  it('wrapMcpError preserves COOLIFY_403_SENSITIVE_REQUIRED with recovery hints', () => {
    const result = wrapMcpError(
      new CoolifyApiError({
        code: 'COOLIFY_403_SENSITIVE_REQUIRED',
        message:
          'Deployment build logs are not available — the API token lacks the api.sensitive ability required to read deployment logs.',
        recoveryHints: RECOVERY_HINTS.COOLIFY_403_SENSITIVE_REQUIRED,
      }),
    );
    expect(result.structuredContent.error.code).toBe(
      'COOLIFY_403_SENSITIVE_REQUIRED',
    );
    expect(result.structuredContent.error.recoveryHints[0]).toContain(
      'api.sensitive',
    );
  });
});

describe('COOLIFY_AMBIGUOUS_MATCH', () => {
  it('is a valid CoolifyErrorCode literal', () => {
    const code: CoolifyErrorCode = 'COOLIFY_AMBIGUOUS_MATCH';
    expect(code).toBe('COOLIFY_AMBIGUOUS_MATCH');
  });

  it('wrapMcpError preserves COOLIFY_AMBIGUOUS_MATCH with static recovery hints', () => {
    const result = wrapMcpError(
      new CoolifyApiError({
        code: 'COOLIFY_AMBIGUOUS_MATCH',
        message: 'Multiple applications matched the mutation input.',
        recoveryHints: [
          'Re-run the mutation with an explicit UUID.',
          'Multiple applications matched — narrow the name/fqdn substring or pass the UUID directly.',
          '- myapp (app-uuid-1)',
        ],
      }),
    );
    expect(result.structuredContent.error.code).toBe('COOLIFY_AMBIGUOUS_MATCH');
    expect(result.structuredContent.error.recoveryHints[0]).toContain('explicit UUID');
    expect(result.structuredContent.error.recoveryHints[1]).toContain('narrow');
  });
});

describe('COOLIFY_CONFIRM_REQUIRED', () => {
  it('is a valid CoolifyErrorCode literal', () => {
    const code: CoolifyErrorCode = 'COOLIFY_CONFIRM_REQUIRED';
    expect(code).toBe('COOLIFY_CONFIRM_REQUIRED');
  });

  it('RECOVERY_HINTS contains Retry with confirm: true', () => {
    const hints = RECOVERY_HINTS.COOLIFY_CONFIRM_REQUIRED;
    expect(hints.some((hint) => hint.includes('Retry with confirm: true'))).toBe(
      true,
    );
  });

  it('CoolifyApiError preserves data on the envelope when provided', () => {
    const error = new CoolifyApiError({
      code: 'COOLIFY_CONFIRM_REQUIRED',
      message: 'Confirmation required',
      recoveryHints: RECOVERY_HINTS.COOLIFY_CONFIRM_REQUIRED,
      data: {
        would_affect: 2,
        sample_uuids: ['a', 'b'],
        action: 'stop_all',
      },
    });
    expect(error.envelope.data).toEqual({
      would_affect: 2,
      sample_uuids: ['a', 'b'],
      action: 'stop_all',
    });
  });

  it('wrapMcpError preserves preview data in structuredContent', () => {
    const result = wrapMcpError(
      new CoolifyApiError({
        code: 'COOLIFY_CONFIRM_REQUIRED',
        message: 'Confirmation required',
        recoveryHints: RECOVERY_HINTS.COOLIFY_CONFIRM_REQUIRED,
        data: {
          would_affect: 1,
          sample_uuids: ['app-1'],
          action: 'stop_all',
        },
      }),
    );
    expect(result.structuredContent.error.code).toBe('COOLIFY_CONFIRM_REQUIRED');
    expect(result.structuredContent.error.data).toEqual({
      would_affect: 1,
      sample_uuids: ['app-1'],
      action: 'stop_all',
    });
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
