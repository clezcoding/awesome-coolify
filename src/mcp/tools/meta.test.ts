import { describe, expect, it } from 'vitest';
import { handleMetaAction, metaActionSchema } from './meta.js';
import { readPackageVersion } from '../../utils/package-version.js';

describe('metaActionSchema', () => {
  it('accepts version action only', () => {
    expect(metaActionSchema.safeParse({ action: 'version' }).success).toBe(true);
    expect(metaActionSchema.safeParse({ action: 'health' }).success).toBe(false);
  });
});

describe('handleMetaAction', () => {
  it('returns mcpVersion matching package version', async () => {
    const result = await handleMetaAction({ action: 'version' });
    expect(result.mcpVersion).toBe(readPackageVersion());
    expect(result.serverName).toBe('awesome-coolify-mcp');
  });

  it('mcpVersion matches readPackageVersion() from package.json', async () => {
    const result = await handleMetaAction({ action: 'version' });
    expect(result.mcpVersion).toBe(readPackageVersion());
    expect(result.mcpVersion).not.toBe('0.1.0');
  });

  it('response contains no env or token fields', async () => {
    const result = await handleMetaAction({ action: 'version' });
    const json = JSON.stringify(result);
    expect(json).not.toContain('COOLIFY_TOKEN');
    expect(json).not.toContain('COOLIFY_URL');
    expect(Object.keys(result)).toEqual(['mcpVersion', 'serverName']);
  });
});
