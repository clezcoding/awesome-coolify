import { ofetch } from 'ofetch';
import { fetchVersion } from '../api/client.js';
import type { EnvConfig } from '../config/env.js';
import { CoolifyApiError, RECOVERY_HINTS } from './errors.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function throwFetchTemplatesFailed(): never {
  throw new CoolifyApiError({
    code: 'COOLIFY_FETCH_TEMPLATES_FAILED',
    message: 'Could not fetch service templates from CDN or GitHub Raw.',
    recoveryHints: RECOVERY_HINTS.COOLIFY_FETCH_TEMPLATES_FAILED,
  });
}

async function resolvePinnedVersion(env: EnvConfig): Promise<string> {
  let version = 'v4.x';
  try {
    const versionData = await fetchVersion(
      env.COOLIFY_URL ?? '',
      env.COOLIFY_TOKEN ?? '',
      env.COOLIFY_VERIFY_SSL,
    );
    const rawVersion =
      typeof versionData === 'object' &&
      versionData !== null &&
      'version' in versionData
        ? String((versionData as { version: unknown }).version)
        : String(versionData);

    if (rawVersion && rawVersion !== 'unknown') {
      version = rawVersion.startsWith('v') ? rawVersion : `v${rawVersion}`;
    }
  } catch {
    // Soft ignore version fetch failures — fall back to v4.x per D-02.
  }
  return version;
}

export async function fetchServiceTemplates(
  env: EnvConfig,
): Promise<Record<string, { name?: string; description?: string }>> {
  const version = await resolvePinnedVersion(env);
  const cdnUrl = `https://cdn.jsdelivr.net/gh/coollabsio/coolify@${version}/templates/service-templates.json`;
  const githubUrl = `https://raw.githubusercontent.com/coollabsio/coolify/${version}/templates/service-templates.json`;

  let raw: unknown;
  try {
    raw = await ofetch(cdnUrl, { parseResponse: JSON.parse });
  } catch {
    try {
      raw = await ofetch(githubUrl, { parseResponse: JSON.parse });
    } catch {
      throwFetchTemplatesFailed();
    }
  }

  if (!isRecord(raw) || Object.keys(raw).length === 0) {
    throwFetchTemplatesFailed();
  }

  return raw as Record<string, { name?: string; description?: string }>;
}

export function mapTemplatesToSlimList(
  raw: Record<string, unknown>,
): { id: string; label: string }[] {
  return Object.entries(raw)
    .map(([id, details]) => ({
      id,
      label:
        isRecord(details) && typeof details.name === 'string'
          ? details.name
          : id,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
}
