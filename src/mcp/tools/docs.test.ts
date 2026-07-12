import { describe, expect, it } from 'vitest';
import { DOCS_INDEX, docsActionSchema, handleDocsAction } from './docs.js';

describe('docsActionSchema', () => {
  it('accepts search action with query and shared read params per D-03 D-21', () => {
    const result = docsActionSchema.safeParse({
      action: 'search',
      query: 'deploy failure',
      format: 'pretty',
      max_chars: 8000,
    });
    expect(result.success).toBe(true);
  });

  it('rejects unknown actions', () => {
    expect(
      docsActionSchema.safeParse({ action: 'read', query: 'test' }).success,
    ).toBe(false);
  });
});

describe('DOCS_INDEX', () => {
  it('contains at least 10 curated documentation entries', () => {
    expect(DOCS_INDEX.length).toBeGreaterThanOrEqual(10);
  });
});

describe('handleDocsAction search', () => {
  it('returns FQDN domain configuration doc for fqdn query', async () => {
    const result = await handleDocsAction({
      action: 'search',
      query: 'fqdn',
    });

    expect(result.ok).toBe(true);
    expect(result.data.length).toBeGreaterThan(0);
    expect(result.data[0].title).toContain('FQDN');
    expect(result._formattedText).toContain('custom domain');
  });

  it('returns deployment troubleshooting entry for deploy failure query', async () => {
    const result = await handleDocsAction({
      action: 'search',
      query: 'failure',
    });

    expect(result.ok).toBe(true);
    expect(result.data.some((doc) => doc.title.includes('deployment'))).toBe(
      true,
    );
    expect(result._formattedText).toContain('troubleshooting');
  });

  it('returns helpful no-results message when query has no matches', async () => {
    const result = await handleDocsAction({
      action: 'search',
      query: 'xyzzy-nonexistent-topic-999',
    });

    expect(result.ok).toBe(true);
    expect(result.data).toHaveLength(0);
    expect(result._formattedText).toContain('No documentation matches found');
    expect(result._formattedText).toContain('xyzzy-nonexistent-topic-999');
  });

  it('respects max_chars truncation per D-13', async () => {
    const result = await handleDocsAction({
      action: 'search',
      query: 'coolify',
      max_chars: 1000,
    });

    expect(result.ok).toBe(true);
    expect(result._meta.truncated).toBe(true);
    expect(result._formattedText.length).toBeLessThanOrEqual(1000);
  });
});
