import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { EnvConfig } from '../config/env.js';

vi.mock('ofetch', () => ({
  ofetch: vi.fn(),
}));

vi.mock('../api/client.js', () => ({
  fetchVersion: vi.fn(),
}));

import { ofetch } from 'ofetch';
import { fetchVersion } from '../api/client.js';
import {
  fetchServiceTemplates,
  mapTemplatesToSlimList,
} from './service-templates.js';

const testEnv: EnvConfig = {
  COOLIFY_URL: 'https://coolify.example.com',
  COOLIFY_TOKEN: 'test-token-value-xyz',
  COOLIFY_VERIFY_SSL: true,
  COOLIFY_MCP_LOG: 'info',
};

const sampleTemplates = {
  gitea: { name: 'Gitea' },
  actualbudget: { name: 'Actual Budget' },
};

describe('fetchServiceTemplates', () => {
  beforeEach(() => {
    vi.mocked(ofetch).mockReset();
    vi.mocked(fetchVersion).mockReset();
    vi.mocked(fetchVersion).mockResolvedValue({ version: '4.1.2' });
  });

  it('returns raw templates from CDN on success', async () => {
    vi.mocked(ofetch).mockResolvedValueOnce(sampleTemplates);

    await expect(fetchServiceTemplates(testEnv)).resolves.toEqual(
      sampleTemplates,
    );
    expect(ofetch).toHaveBeenCalledTimes(1);
    expect(String(vi.mocked(ofetch).mock.calls[0]?.[0])).toContain(
      'cdn.jsdelivr.net/gh/coollabsio/coolify@v4.1.2/templates/service-templates.json',
    );
  });

  it('falls back to GitHub Raw when CDN rejects', async () => {
    vi.mocked(ofetch)
      .mockRejectedValueOnce(new Error('CDN unavailable'))
      .mockResolvedValueOnce(sampleTemplates);

    await expect(fetchServiceTemplates(testEnv)).resolves.toEqual(
      sampleTemplates,
    );
    expect(ofetch).toHaveBeenCalledTimes(2);
    expect(String(vi.mocked(ofetch).mock.calls[1]?.[0])).toContain(
      'raw.githubusercontent.com/coollabsio/coolify/v4.1.2/templates/service-templates.json',
    );
  });

  it('throws COOLIFY_FETCH_TEMPLATES_FAILED on double failure', async () => {
    vi.mocked(ofetch)
      .mockRejectedValueOnce(new Error('CDN unavailable'))
      .mockRejectedValueOnce(new Error('GitHub unavailable'));

    await expect(fetchServiceTemplates(testEnv)).rejects.toMatchObject({
      envelope: {
        code: 'COOLIFY_FETCH_TEMPLATES_FAILED',
        message: 'Could not fetch service templates from CDN or GitHub Raw.',
      },
    });
  });

  it('throws COOLIFY_FETCH_TEMPLATES_FAILED on empty object response', async () => {
    vi.mocked(ofetch).mockResolvedValueOnce({});

    await expect(fetchServiceTemplates(testEnv)).rejects.toMatchObject({
      envelope: { code: 'COOLIFY_FETCH_TEMPLATES_FAILED' },
    });
  });

  it('pins version from fetchVersion with v prefix when missing', async () => {
    vi.mocked(fetchVersion).mockResolvedValue('4.0.0');
    vi.mocked(ofetch).mockResolvedValueOnce(sampleTemplates);

    await fetchServiceTemplates(testEnv);

    expect(String(vi.mocked(ofetch).mock.calls[0]?.[0])).toContain(
      '@v4.0.0/templates/service-templates.json',
    );
  });

  it('falls back to v4.x when fetchVersion fails', async () => {
    vi.mocked(fetchVersion).mockRejectedValue(new Error('version unavailable'));
    vi.mocked(ofetch).mockResolvedValueOnce(sampleTemplates);

    await fetchServiceTemplates(testEnv);

    expect(String(vi.mocked(ofetch).mock.calls[0]?.[0])).toContain(
      '@v4.x/templates/service-templates.json',
    );
  });
});

describe('mapTemplatesToSlimList', () => {
  it('sorts by id and uses name when present', () => {
    expect(
      mapTemplatesToSlimList({
        zebra: { name: 'Zebra Service' },
        alpha: { name: 'Alpha Service' },
      }),
    ).toEqual([
      { id: 'alpha', label: 'Alpha Service' },
      { id: 'zebra', label: 'Zebra Service' },
    ]);
  });

  it('falls back to id when name is absent', () => {
    expect(
      mapTemplatesToSlimList({
        redis: {},
        mysql: { description: 'Database only' },
      }),
    ).toEqual([
      { id: 'mysql', label: 'mysql' },
      { id: 'redis', label: 'redis' },
    ]);
  });
});
