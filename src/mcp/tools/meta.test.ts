import { describe, expect, it } from 'vitest';
import {
  handleMetaAction,
  metaActionSchema,
  MCP_VERSION,
} from './meta.js';

describe('metaActionSchema', () => {
  it('accepts version action only', () => {
    expect(metaActionSchema.safeParse({ action: 'version' }).success).toBe(true);
    expect(metaActionSchema.safeParse({ action: 'health' }).success).toBe(false);
  });
});

describe('handleMetaAction', () => {
  it('returns mcpVersion matching package version', async () => {
    const result = await handleMetaAction({ action: 'version' });
    expect(result.mcpVersion).toBe(MCP_VERSION);
    expect(result.serverName).toBe('coolify-mcp');
  });

  it('response contains no env or token fields', async () => {
    const result = await handleMetaAction({ action: 'version' });
    const json = JSON.stringify(result);
    expect(json).not.toContain('COOLIFY_TOKEN');
    expect(json).not.toContain('COOLIFY_URL');
    expect(Object.keys(result)).toEqual(['mcpVersion', 'serverName']);
  });
});
