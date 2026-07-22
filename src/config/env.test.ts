import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  formatEnvLoadHint,
  loadEnv,
  mergeDotEnv,
  parseDotEnv,
} from './env.js';

describe('loadEnv', () => {
  it('throws COOLIFY_PARTIAL_ENV when COOLIFY_URL is absent', () => {
    try {
      loadEnv({ COOLIFY_TOKEN: 'secret-token' });
      expect.fail('expected COOLIFY_PARTIAL_ENV');
    } catch (error) {
      expect(error).toMatchObject({ envelope: { code: 'COOLIFY_PARTIAL_ENV' } });
    }
  });

  it('throws COOLIFY_PARTIAL_ENV when COOLIFY_TOKEN is absent', () => {
    try {
      loadEnv({ COOLIFY_URL: 'https://coolify.example.com' });
      expect.fail('expected COOLIFY_PARTIAL_ENV');
    } catch (error) {
      expect(error).toMatchObject({ envelope: { code: 'COOLIFY_PARTIAL_ENV' } });
    }
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

  it('loadEnv with no COOLIFY_* keys returns soft-start config (D-18)', () => {
    const env = loadEnv({});
    expect(env.COOLIFY_URL).toBeUndefined();
    expect(env.COOLIFY_TOKEN).toBeUndefined();
    expect(env.COOLIFY_VERIFY_SSL).toBe(true);
    expect(env.COOLIFY_MCP_LOG).toBe('info');
  });

  it('loadEnv with only COOLIFY_URL throws COOLIFY_PARTIAL_ENV (D-13)', () => {
    try {
      loadEnv({ COOLIFY_URL: 'https://only-url.example.com' });
      expect.fail('expected COOLIFY_PARTIAL_ENV');
    } catch (error) {
      expect(error).toMatchObject({ envelope: { code: 'COOLIFY_PARTIAL_ENV' } });
    }
  });
});

describe('parseDotEnv', () => {
  it('parses keys, ignores comments, strips quotes', () => {
    const parsed = parseDotEnv(
      [
        '# comment',
        'COOLIFY_URL=https://coolify.example.com',
        "COOLIFY_TOKEN='secret-token'",
        'COOLIFY_MCP_LOG="debug"',
        '',
        'IGNORED_NO_EQ',
      ].join('\n'),
    );

    expect(parsed).toEqual({
      COOLIFY_URL: 'https://coolify.example.com',
      COOLIFY_TOKEN: 'secret-token',
      COOLIFY_MCP_LOG: 'debug',
    });
  });
});

describe('mergeDotEnv', () => {
  it('fills missing keys from .env and does not override existing', () => {
    const dir = mkdtempSync(join(tmpdir(), 'awesome-coolify-mcp-env-'));
    const path = join(dir, '.env');
    writeFileSync(
      path,
      [
        'COOLIFY_URL=https://from-dotenv.example.com',
        'COOLIFY_TOKEN=from-dotenv',
        'COOLIFY_MCP_LOG=debug',
      ].join('\n'),
    );

    const merged = mergeDotEnv(
      {
        COOLIFY_URL: 'https://from-process.example.com',
      },
      path,
    );

    expect(merged.COOLIFY_URL).toBe('https://from-process.example.com');
    expect(merged.COOLIFY_TOKEN).toBe('from-dotenv');
    expect(merged.COOLIFY_MCP_LOG).toBe('debug');
  });
});

describe('formatEnvLoadHint', () => {
  it('mentions mcp.json and .env', () => {
    const hint = formatEnvLoadHint(new Error('Required'));
    expect(hint).toContain('mcp.json');
    expect(hint).toContain('.env');
  });
});
