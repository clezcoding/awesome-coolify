import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ZodError } from 'zod';
import {
  formatEnvLoadHint,
  loadEnv,
  mergeDotEnv,
  parseDotEnv,
} from './env.js';

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
  it('mentions mcp.json, .env, and npm start', () => {
    const hint = formatEnvLoadHint(new Error('Required'));
    expect(hint).toContain('mcp.json');
    expect(hint).toContain('.env');
    expect(hint).toContain('npm start');
  });
});
