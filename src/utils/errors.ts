import { redactSecrets } from './redact.js';

export type CoolifyErrorCode =
  | 'COOLIFY_401'
  | 'COOLIFY_404'
  | 'COOLIFY_422'
  | 'COOLIFY_500'
  | 'COOLIFY_NETWORK'
  | 'COOLIFY_TIMEOUT'
  | 'COOLIFY_AMBIGUOUS_MATCH'
  | 'COOLIFY_403_SENSITIVE_REQUIRED'
  | 'COOLIFY_CONFIRM_REQUIRED';

export interface CoolifyErrorEnvelope {
  code: CoolifyErrorCode;
  message: string;
  recoveryHints: string[];
  httpStatus?: number;
  data?: Record<string, unknown>;
}

export class CoolifyApiError extends Error {
  readonly envelope: CoolifyErrorEnvelope;

  constructor(envelope: CoolifyErrorEnvelope) {
    super(envelope.message);
    this.name = 'CoolifyApiError';
    this.envelope = envelope;
  }
}

export const RECOVERY_HINTS: Record<CoolifyErrorCode, string[]> = {
  COOLIFY_401: [
    'Verify your API token in the Coolify UI under Keys & Tokens.',
    'Ensure the token has not expired or been revoked.',
  ],
  COOLIFY_404: [
    'Check that the resource UUID or path exists on this Coolify instance.',
    'Confirm COOLIFY_URL points to the correct instance.',
  ],
  COOLIFY_422: [
    'Review the request payload for missing or invalid fields.',
    'Check Coolify API docs for required parameters.',
  ],
  COOLIFY_500: [
    'Retry after a short delay — the Coolify server may be temporarily overloaded.',
    'Check Coolify server logs for internal errors.',
  ],
  COOLIFY_NETWORK: [
    'Verify COOLIFY_URL is reachable from this machine.',
    'Check firewall rules and DNS resolution.',
  ],
  COOLIFY_TIMEOUT: [
    'The Coolify instance did not respond in time — retry the request.',
    'Check network latency and server load.',
  ],
  COOLIFY_AMBIGUOUS_MATCH: [
    'Re-run the mutation with an explicit UUID.',
    'Multiple applications matched — narrow the name/fqdn substring or pass the UUID directly.',
  ],
  COOLIFY_403_SENSITIVE_REQUIRED: [
    'The API token lacks the `api.sensitive` ability required to read deployment build logs.',
    'Regenerate the token in the Coolify UI under Keys & Tokens with the `api.sensitive` scope enabled.',
  ],
  COOLIFY_CONFIRM_REQUIRED: [
    'Retry with confirm: true',
    'This is a high-impact bulk operation — verify the preview block (would_affect, sample_uuids) before retrying.',
  ],
};

function sanitizeMessage(message: string): string {
  return redactSecrets(message);
}

function statusToCode(status: number): CoolifyErrorCode {
  switch (status) {
    case 401:
      return 'COOLIFY_401';
    case 404:
      return 'COOLIFY_404';
    case 400:
    case 422:
      return 'COOLIFY_422';
    default:
      return 'COOLIFY_500';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function extractCoolifyMessage(data: unknown): string | undefined {
  if (!isRecord(data)) {
    return undefined;
  }
  const message = data.message;
  if (typeof message === 'string' && message.trim().length > 0) {
    return message.trim();
  }
  return undefined;
}

export function mapApiError(
  error: unknown,
  httpStatus?: number,
  coolifyMessage?: string,
): CoolifyErrorEnvelope {
  if (httpStatus !== undefined) {
    const code = statusToCode(httpStatus);
    const trimmedCoolifyMessage =
      typeof coolifyMessage === 'string' ? coolifyMessage.trim() : '';
    const message =
      trimmedCoolifyMessage.length > 0
        ? sanitizeMessage(trimmedCoolifyMessage)
        : sanitizeMessage(`Coolify API returned HTTP ${httpStatus}`);
    return {
      code,
      message,
      recoveryHints: RECOVERY_HINTS[code],
      httpStatus,
    };
  }

  const err = error as Error & { code?: string; name?: string; cause?: unknown };

  if (err?.name === 'AbortError') {
    return {
      code: 'COOLIFY_TIMEOUT',
      message: sanitizeMessage(err.message || 'Request timed out'),
      recoveryHints: RECOVERY_HINTS.COOLIFY_TIMEOUT,
    };
  }

  const networkCodes = new Set([
    'ECONNREFUSED',
    'ENOTFOUND',
    'ECONNRESET',
    'EAI_AGAIN',
    'ETIMEDOUT',
  ]);

  if (err?.code && networkCodes.has(err.code)) {
    return {
      code: 'COOLIFY_NETWORK',
      message: sanitizeMessage(err.message || 'Network error connecting to Coolify'),
      recoveryHints: RECOVERY_HINTS.COOLIFY_NETWORK,
    };
  }

  const message = sanitizeMessage(
    err instanceof Error ? err.message : String(error),
  );

  return {
    code: 'COOLIFY_NETWORK',
    message,
    recoveryHints: RECOVERY_HINTS.COOLIFY_NETWORK,
  };
}

export function toStructuredError(error: unknown): CoolifyErrorEnvelope {
  if (error instanceof CoolifyApiError) {
    return error.envelope;
  }

  const fetchError = error as {
    response?: { status?: number; _data?: unknown };
    status?: number;
    statusCode?: number;
    data?: unknown;
  };

  const status =
    fetchError.response?.status ??
    fetchError.status ??
    fetchError.statusCode;

  const coolifyMessage =
    extractCoolifyMessage(fetchError.response?._data) ??
    extractCoolifyMessage(fetchError.data);

  if (typeof status === 'number') {
    return mapApiError(error, status, coolifyMessage);
  }

  return mapApiError(error);
}

export interface McpErrorResult {
  isError: true;
  content: [{ type: 'text'; text: string }];
  structuredContent: { ok: false; error: CoolifyErrorEnvelope };
}

function redactEnvelopeData(
  data: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!data) return undefined;
  const redacted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string') {
      redacted[key] = redactSecrets(value);
    } else if (Array.isArray(value)) {
      redacted[key] = value.map((entry) =>
        typeof entry === 'string' ? redactSecrets(entry) : entry,
      );
    } else if (value !== null && typeof value === 'object') {
      redacted[key] = redactSecrets(JSON.stringify(value));
    } else {
      redacted[key] = value;
    }
  }
  return redacted;
}

export function wrapMcpError(error: unknown): McpErrorResult {
  const raw = toStructuredError(error);
  const envelope: CoolifyErrorEnvelope = {
    ...raw,
    message: redactSecrets(raw.message),
    recoveryHints: raw.recoveryHints.map((hint) => redactSecrets(hint)),
    ...(raw.data ? { data: redactEnvelopeData(raw.data) } : {}),
  };
  return {
    isError: true,
    content: [{ type: 'text', text: JSON.stringify(envelope, null, 2) }],
    structuredContent: { ok: false, error: envelope },
  };
}
