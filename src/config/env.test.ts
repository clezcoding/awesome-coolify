import { describe, expect, it } from 'vitest';
import { ZodError } from 'zod';
import { loadEnv } from './env.js';

describe('loadEnv', () => {
  it('throws when COOLIFY_URL is absent', () => {
    expect(() =>
      loadEnv({ COOLIFY_TOKEN: 'secret-token' }),
    ).toThrow(ZodError);
  });

  it('throws when COOLIFY_TOKEN is absent', () => {
    expect(() =>
      loadEnv({ COOLIFY_URL: 'https://coolify.example.com' }),
    ).toThrow(ZodError);
  });

  it('returns parsed config when required vars are set', () => {
    const env = loadEnv({
      COOLIFY_URL: 'https://coolify.example.com',
      COOLIFY_TOKEN: 'secret-token',
    });

    expect(env.COOLIFY_URL).toBe('https://coolify.example.com');
    expect(env.COOLIFY_TOKEN).toBe('secret-token');
    expect(env.COOLIFY_VERIFY_SSL).toBe(true);
    expect(env.COOLIFY_MCP_LOG).toBe('info');
  });

  it('sets COOLIFY_VERIFY_SSL false only when env is literal false', () => {
    const env = loadEnv({
      COOLIFY_URL: 'https://coolify.example.com',
      COOLIFY_TOKEN: 'secret-token',
      COOLIFY_VERIFY_SSL: 'false',
    });

    expect(env.COOLIFY_VERIFY_SSL).toBe(false);
  });

  it('accepts COOLIFY_MCP_LOG enum values', () => {
    const env = loadEnv({
      COOLIFY_URL: 'https://coolify.example.com',
      COOLIFY_TOKEN: 'secret-token',
      COOLIFY_MCP_LOG: 'debug',
    });

    expect(env.COOLIFY_MCP_LOG).toBe('debug');
  });
});
