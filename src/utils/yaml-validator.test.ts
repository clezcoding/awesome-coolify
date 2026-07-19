import { describe, expect, it } from 'vitest';
import {
  decodeCompose,
  encodeCompose,
  projectServiceCompose,
  validateCompose,
} from './yaml-validator.js';

describe('encodeCompose / decodeCompose', () => {
  it('round-trips YAML through base64', () => {
    expect(decodeCompose(encodeCompose('foo: bar'))).toBe('foo: bar');
  });

  it('round-trips empty string', () => {
    expect(decodeCompose(encodeCompose(''))).toBe('');
  });

  it('returns empty string for invalid base64 without throwing', () => {
    expect(decodeCompose('!!!not-valid-base64!!!')).toBe('');
  });
});

describe('validateCompose', () => {
  it('returns ok for valid YAML', () => {
    expect(validateCompose('foo: bar')).toEqual({ ok: true });
  });

  it('returns error for empty string', () => {
    expect(validateCompose('')).toEqual({
      ok: false,
      error: 'compose YAML is empty',
    });
    expect(validateCompose('   ')).toEqual({
      ok: false,
      error: 'compose YAML is empty',
    });
  });

  it('returns error for malformed YAML', () => {
    const result = validateCompose(': : :');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.length).toBeGreaterThan(0);
    }
  });

  it('returns ok for realistic docker-compose YAML', () => {
    const compose = `services:
  redis:
    image: redis:7
    ports:
      - "6379:6379"`;
    expect(validateCompose(compose)).toEqual({ ok: true });
  });
});

describe('projectServiceCompose', () => {
  it('decodes docker_compose_raw to compose and removes base64 field', () => {
    const yaml = 'services:\n  redis:\n    image: redis:7';
    const input = { uuid: 'svc-1', docker_compose_raw: encodeCompose(yaml) };

    const result = projectServiceCompose(input);

    expect(result.compose).toBe(yaml);
    expect(result.docker_compose_raw).toBeUndefined();
    expect(result.uuid).toBe('svc-1');
  });

  it('returns input unchanged when docker_compose_raw is absent', () => {
    const input = { uuid: 'svc-1', name: 'my-service' };
    expect(projectServiceCompose(input)).toBe(input);
    expect(projectServiceCompose(input)).not.toHaveProperty('compose');
  });

  it('returns input unchanged when docker_compose_raw is empty', () => {
    const input = { uuid: 'svc-1', docker_compose_raw: '' };
    expect(projectServiceCompose(input)).toBe(input);
    expect(projectServiceCompose(input)).not.toHaveProperty('compose');
  });

  it('does not mutate the input object', () => {
    const yaml = 'services:\n  redis:\n    image: redis:7';
    const input = { uuid: 'svc-1', docker_compose_raw: encodeCompose(yaml) };
    const snapshot = { ...input };

    projectServiceCompose(input);

    expect(input).toEqual(snapshot);
  });
});
