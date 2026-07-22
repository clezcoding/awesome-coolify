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

  it('maps HTTP 409 to COOLIFY_409', () => {
    const envelope = mapApiError(null, 409);
    expect(envelope.code).toBe('COOLIFY_409');
    expect(envelope.recoveryHints).toEqual(RECOVERY_HINTS.COOLIFY_409);
  });

  it('maps HTTP 422 to COOLIFY_422', () => {
    expect(mapApiError(null, 422).code).toBe('COOLIFY_422');
  });

  it('maps HTTP 400 to COOLIFY_422', () => {
    expect(mapApiError(null, 400).code).toBe('COOLIFY_422');
    expect(mapApiError(null, 400).httpStatus).toBe(400);
  });

  it('maps HTTP 400 with coolifyMessage to COOLIFY_422 using body message', () => {
    const envelope = mapApiError(null, 400, 'Custom Coolify message');
    expect(envelope.code).toBe('COOLIFY_422');
    expect(envelope.message).toBe('Custom Coolify message');
    expect(envelope.httpStatus).toBe(400);
  });

  it('maps HTTP 400 with coolifyMessage Service is already running.', () => {
    const envelope = mapApiError(null, 400, 'Service is already running.');
    expect(envelope.code).toBe('COOLIFY_422');
    expect(envelope.message).toBe('Service is already running.');
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

describe('COOLIFY_SSH_UNREACHABLE', () => {
  it('is a valid CoolifyErrorCode literal', () => {
    const code: CoolifyErrorCode = 'COOLIFY_SSH_UNREACHABLE';
    expect(code).toBe('COOLIFY_SSH_UNREACHABLE');
  });

  it('RECOVERY_HINTS lists SSH validation troubleshooting steps', () => {
    const hints = RECOVERY_HINTS.COOLIFY_SSH_UNREACHABLE;
    expect(hints).toHaveLength(3);
    expect(hints[0]).toMatch(/IP, port/i);
    expect(hints[1]).toMatch(/private key UUID/i);
    expect(hints[2]).toMatch(/firewall/i);
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

describe('COOLIFY_VALIDATION_ERROR', () => {
  it('is a valid CoolifyErrorCode literal', () => {
    const code: CoolifyErrorCode = 'COOLIFY_VALIDATION_ERROR';
    expect(code).toBe('COOLIFY_VALIDATION_ERROR');
  });

  it('RECOVERY_HINTS mentions MCP Zod validation and service.create for dockercompose', () => {
    const hints = RECOVERY_HINTS.COOLIFY_VALIDATION_ERROR;
    expect(hints).toHaveLength(2);
    expect(hints[0]).toMatch(/MCP Zod validation/i);
    expect(hints[1]).toMatch(/dockercompose.*service\.create/i);
  });

  it('wrapMcpError preserves COOLIFY_VALIDATION_ERROR with recovery hints', () => {
    const result = wrapMcpError(
      new CoolifyApiError({
        code: 'COOLIFY_VALIDATION_ERROR',
        message: 'build_pack dockercompose not supported on application.create',
        recoveryHints: RECOVERY_HINTS.COOLIFY_VALIDATION_ERROR,
      }),
    );
    expect(result.structuredContent.error.code).toBe('COOLIFY_VALIDATION_ERROR');
    expect(result.structuredContent.error.recoveryHints[1]).toContain(
      'service.create',
    );
  });
});

describe('409 conflicts passthrough', () => {
  it('toStructuredError attaches conflicts array from response._data on HTTP 409', () => {
    const conflicts = [
      {
        domain: 'taken.example.com',
        resource_name: 'other-app',
        resource_uuid: 'app-other',
        resource_type: 'application',
        message: 'Domain already in use',
      },
    ];
    const fetchError = {
      response: {
        status: 409,
        _data: { message: 'Domain conflict', conflicts },
      },
    };
    const envelope = toStructuredError(fetchError);
    expect(envelope.code).toBe('COOLIFY_409');
    expect(envelope.httpStatus).toBe(409);
    expect(envelope.message).toBe('Domain conflict');
    expect(envelope.data?.conflicts).toEqual(conflicts);
  });

  it('toStructuredError omits data.conflicts when response has no conflicts array', () => {
    const fetchError = {
      response: {
        status: 409,
        _data: {
          message: 'Resource has dependents',
          dependent_uuids: ['dep-1'],
        },
      },
    };
    const envelope = toStructuredError(fetchError);
    expect(envelope.code).toBe('COOLIFY_409');
    expect(envelope.data?.conflicts).toBeUndefined();
  });

  it('wrapMcpError passes conflicts through without redacting domain names', () => {
    const conflicts = [{ domain: 'app.example.com', message: 'in use' }];
    const result = wrapMcpError({
      response: {
        status: 409,
        _data: { message: 'Conflict', conflicts },
      },
    });
    expect(result.structuredContent.error.data?.conflicts).toEqual(conflicts);
  });
});

describe('toStructuredError', () => {
  it('extracts Coolify message from ofetch FetchError response._data.message', () => {
    const fetchError = {
      response: {
        status: 400,
        _data: { message: 'Service is already running.' },
      },
    };
    const envelope = toStructuredError(fetchError);
    expect(envelope.code).toBe('COOLIFY_422');
    expect(envelope.message).toBe('Service is already running.');
    expect(envelope.httpStatus).toBe(400);
  });

  it('falls back to generic HTTP message when no body message', () => {
    const fetchError = {
      response: {
        status: 400,
        _data: {},
      },
    };
    const envelope = toStructuredError(fetchError);
    expect(envelope.code).toBe('COOLIFY_422');
    expect(envelope.message).toBe('Coolify API returned HTTP 400');
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

describe('Cloud hostname error mapping', () => {
  it('maps app.coolify.io HTTP 403 to COOLIFY_CLOUD_FORBIDDEN (CLD-02)', () => {
    const envelope = toStructuredError({
      request: 'https://app.coolify.io/api/v1/servers',
      response: { status: 403, _data: { message: 'Forbidden' } },
    });
    expect(envelope.code).toBe('COOLIFY_CLOUD_FORBIDDEN');
  });

  it(
    'cloud 403 envelope recoveryHints mention team-scoped token (CLD-02)',
    () => {
      const envelope = toStructuredError({
        request: 'https://app.coolify.io/api/v1/servers',
        response: { status: 403, _data: { message: 'Forbidden' } },
      });
      expect(envelope.recoveryHints[0]).toMatch(/team-scoped token/i);
    },
  );

  it(
    'maps app.coolify.io HTTP 404 to COOLIFY_CLOUD_UNSUPPORTED (CLD-02)',
    () => {
      const envelope = toStructuredError({
        request: 'https://app.coolify.io/api/v1/unsupported',
        response: { status: 404, _data: { message: 'Not found' } },
      });
      expect(envelope.code).toBe('COOLIFY_CLOUD_UNSUPPORTED');
    },
  );

  it(
    'cloud 404 envelope recoveryHints mention endpoint not supported on Coolify Cloud (CLD-02)',
    () => {
      const envelope = toStructuredError({
        request: 'https://app.coolify.io/api/v1/unsupported',
        response: { status: 404, _data: { message: 'Not found' } },
      });
      expect(envelope.recoveryHints[0]).toMatch(
        /Endpoint not supported|not available on Coolify Cloud/i,
      );
    },
  );

  it(
    'self-hosted hostname 403 does not map to COOLIFY_CLOUD_* codes (D-03)',
    () => {
      const envelope = toStructuredError({
        request: 'https://coolify.example.com/api/v1/servers',
        response: { status: 403 },
      });
      expect(envelope.code.startsWith('COOLIFY_CLOUD_')).toBe(false);
    },
  );

  it(
    'RECOVERY_HINTS defines COOLIFY_CLOUD_FORBIDDEN and COOLIFY_CLOUD_UNSUPPORTED (CLD-02)',
    () => {
      const forbidden = 'COOLIFY_CLOUD_FORBIDDEN' as CoolifyErrorCode;
      const unsupported = 'COOLIFY_CLOUD_UNSUPPORTED' as CoolifyErrorCode;
      expect(RECOVERY_HINTS[forbidden]?.length).toBeGreaterThanOrEqual(1);
      expect(RECOVERY_HINTS[unsupported]?.length).toBeGreaterThanOrEqual(1);
    },
  );

  it(
    'CoolifyErrorCode union includes COOLIFY_CLOUD_FORBIDDEN and COOLIFY_CLOUD_UNSUPPORTED (CLD-02)',
    () => {
      const forbidden = 'COOLIFY_CLOUD_FORBIDDEN' as CoolifyErrorCode;
      const unsupported = 'COOLIFY_CLOUD_UNSUPPORTED' as CoolifyErrorCode;
      expect(RECOVERY_HINTS[forbidden].length).toBeGreaterThanOrEqual(1);
      expect(RECOVERY_HINTS[unsupported].length).toBeGreaterThanOrEqual(1);
    },
  );
});
