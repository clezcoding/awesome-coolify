/**
 * docs-parity — README.md / README.de.md structural + content invariants.
 * Decisions: D-11 (structural parity), D-13 (no .planning links), D-14 (fix stale claims), D-09 (full action inventory).
 * Updated for the redesigned README (icons/badges/hero banner, status-not-versioned framing, "Coming soon" roadmap section).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = resolve(import.meta.dirname, '../..');
const README_EN = resolve(ROOT, 'README.md');
const README_DE = resolve(ROOT, 'README.de.md');

const CANONICAL_SECTIONS = [
  { en: '📋 Table of contents', de: '📋 Inhaltsverzeichnis' },
  { en: '🔭 Overview', de: '🔭 Überblick' },
  { en: '🆚 Why awesome-coolify-mcp', de: '🆚 Warum awesome-coolify-mcp' },
  { en: '✨ Features', de: '✨ Features' },
  { en: '🏗️ How it works', de: '🏗️ Architektur' },
  { en: '🚀 Quick start', de: '🚀 Schnellstart' },
  { en: '📦 Install', de: '📦 Installation' },
  { en: '🖥️ Supported clients', de: '🖥️ Unterstützte Clients' },
  { en: '🔐 Environment variables', de: '🔐 Umgebungsvariablen' },
  { en: '☁️ Coolify Cloud', de: '☁️ Coolify Cloud' },
  { en: '🧰 Tools reference', de: '🧰 Tools-Referenz' },
  { en: '🛡️ Safety model', de: '🛡️ Sicherheitsmodell' },
  { en: '⚠️ Structured errors & retries', de: '⚠️ Strukturierte Fehler & Retries' },
  { en: '💬 Example agent workflows', de: '💬 Beispiel-Agent-Workflows' },
  { en: '✅ Status today', de: '✅ Status heute' },
  { en: '🔮 Coming soon', de: '🔮 Demnächst' },
  { en: '🛠️ Local development', de: '🛠️ Lokale Entwicklung' },
  { en: '🔗 Links', de: '🔗 Links' },
] as const;

const TOOL_ACTIONS: Record<string, readonly string[]> = {
  system: ['health', 'version', 'verify', 'infrastructure_overview'],
  meta: ['version'],
  resource: ['list', 'find'],
  diagnose: ['app', 'server', 'scan'],
  application: ['start', 'stop', 'restart', 'deploy', 'logs', 'get'],
  deployment: ['list', 'get', 'cancel'],
  service: ['start', 'stop', 'restart', 'deploy', 'get'],
  database: ['start', 'stop', 'restart', 'get'],
  private_key: ['list', 'get', 'create', 'update', 'delete', 'delete_preview'],
  server: ['get', 'create', 'update', 'delete', 'delete_preview', 'validate'],
  project: ['list', 'get', 'create', 'update', 'delete', 'delete_preview'],
  environment: ['list', 'get', 'create', 'delete', 'delete_preview'],
  docs: ['search'],
  emergency: ['stop_all', 'redeploy_project', 'restart_project'],
  instance: ['list', 'get', 'add', 'update', 'delete', 'set-default', 'import-env', 'cloud-info'],
  manifest: ['get', 'upsert', 'set', 'remove', 'clear', 'sync', 'diff'],
};

const STALE_COOLIFY_MCP = /(?<![\w.-])coolify-mcp(?![\w-])/g;

function readReadme(path: string): string {
  return readFileSync(path, 'utf8');
}

function extractH2(content: string): string[] {
  return content
    .split('\n')
    .filter((line) => line.startsWith('## '))
    .map((line) => line.slice(3).trim());
}

function extractSafetySection(content: string, locale: 'en' | 'de'): string {
  const heading = locale === 'en' ? '## 🛡️ Safety model' : '## 🛡️ Sicherheitsmodell';
  const lines = content.split('\n');
  const start = lines.findIndex((line) => line === heading);
  expect(start, `${heading} section must exist`).toBeGreaterThanOrEqual(0);
  const body: string[] = [];
  for (let i = start + 1; i < lines.length; i++) {
    if (lines[i].startsWith('## ')) break;
    body.push(lines[i]);
  }
  return body.join('\n');
}

describe('docs parity (Wave 0)', () => {
  const en = readReadme(README_EN);
  const de = readReadme(README_DE);

  it('both README.md and README.de.md exist and are non-empty', () => {
    expect(en.length).toBeGreaterThan(0);
    expect(de.length).toBeGreaterThan(0);
  });

  it('D-11: structural H2 parity via canonical-slug map (EN↔DE position-by-position)', () => {
    const enH2 = extractH2(en);
    const deH2 = extractH2(de);

    expect(enH2.length).toBe(CANONICAL_SECTIONS.length);
    expect(deH2.length).toBe(CANONICAL_SECTIONS.length);

    for (let i = 0; i < CANONICAL_SECTIONS.length; i++) {
      expect(enH2[i]).toBe(CANONICAL_SECTIONS[i].en);
      expect(deH2[i]).toBe(CANONICAL_SECTIONS[i].de);
    }
  });

  it('D-09: full action inventory — all 16 tools and action literals in both READMEs', () => {
    let enActionCount = 0;
    let deActionCount = 0;

    for (const [tool, actions] of Object.entries(TOOL_ACTIONS)) {
      expect(en).toContain(tool);
      expect(de).toContain(tool);
      for (const action of actions) {
        expect(en).toContain(action);
        expect(de).toContain(action);
        enActionCount++;
        deActionCount++;
      }
    }

    expect(enActionCount).toBeGreaterThanOrEqual(70);
    expect(deActionCount).toBeGreaterThanOrEqual(70);
  });

  it('D-11: Safety/Sicherheit section contains confirm and reveal in both locales', () => {
    const enSafety = extractSafetySection(en, 'en');
    const deSafety = extractSafetySection(de, 'de');

    expect(enSafety).toContain('confirm');
    expect(enSafety).toContain('reveal');
    expect(deSafety).toContain('confirm');
    expect(deSafety).toContain('reveal');
  });

  it('D-13: neither README links to .planning/ or spike-findings', () => {
    for (const content of [en, de]) {
      expect(content).not.toContain('.planning/');
      expect(content).not.toContain('spike-findings');
    }
  });

  it('D-14: no stale placeholders or old coolify-mcp package name (word-boundary regex)', () => {
    for (const content of [en, de]) {
      expect(content).not.toContain('YOUR_ORG');
      expect(content).not.toContain('LICENSE to be added');
      expect(content.match(STALE_COOLIFY_MCP) ?? []).toHaveLength(0);
    }

    // Sanity: word-boundary regex must not flag awesome-coolify-mcp
    expect('awesome-coolify-mcp'.match(STALE_COOLIFY_MCP)).toBeNull();
    expect('coolify-mcp'.match(STALE_COOLIFY_MCP)).toEqual(['coolify-mcp']);
  });
});
