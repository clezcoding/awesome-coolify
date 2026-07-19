import { parse } from 'yaml';

export function encodeCompose(yaml: string): string {
  return Buffer.from(yaml, 'utf8').toString('base64');
}

export function decodeCompose(base64: string): string | null {
  if (base64 === '') {
    return '';
  }
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) {
    return null;
  }
  try {
    return Buffer.from(base64, 'base64').toString('utf8');
  } catch {
    return null;
  }
}

export function validateCompose(
  yaml: string,
): { ok: true } | { ok: false; error: string } {
  if (yaml.trim() === '') {
    return { ok: false, error: 'compose YAML is empty' };
  }
  try {
    parse(yaml);
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: message };
  }
}

export function projectServiceCompose(
  raw: Record<string, unknown>,
): Record<string, unknown> {
  const dockerComposeRaw = raw.docker_compose_raw;
  if (typeof dockerComposeRaw !== 'string' || dockerComposeRaw === '') {
    return raw;
  }

  const decoded = decodeCompose(dockerComposeRaw);
  if (decoded === null) {
    const result = {
      ...raw,
      compose_decode_error: 'invalid base64 in docker_compose_raw',
    };
    delete result.docker_compose_raw;
    return result;
  }

  const result = { ...raw, compose: decoded };
  delete result.docker_compose_raw;
  return result;
}
