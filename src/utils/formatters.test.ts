import { describe, expect, it } from 'vitest';
import {
  paginateArray,
  formatTable,
  formatOutput,
  truncateAndGuard,
  applySizeWarning,
  buildReadResponse,
} from './formatters.js';

describe('paginateArray', () => {
  const items = Array.from({ length: 25 }, (_, i) => ({ id: i + 1 }));

  it('defaults to page 1 per_page 10 per D-15', () => {
    const page1 = paginateArray(items);
    expect(page1).toHaveLength(10);
    expect(page1[0].id).toBe(1);
    expect(page1[9].id).toBe(10);
  });

  it('returns items 11-20 for page 2 per_page 10', () => {
    const page2 = paginateArray(items, 2, 10);
    expect(page2).toHaveLength(10);
    expect(page2[0].id).toBe(11);
    expect(page2[9].id).toBe(20);
  });

  it('caps per_page at max 100', () => {
    const big = Array.from({ length: 150 }, (_, i) => i);
    const result = paginateArray(big, 1, 200);
    expect(result).toHaveLength(100);
  });
});

describe('formatOutput', () => {
  const data = [{ uuid: 'a1', name: 'app', status: 'running' }];

  it('returns indented JSON for pretty format per D-09', () => {
    const output = formatOutput(data, 'pretty');
    expect(output).toContain('\n');
    expect(output).toContain('"uuid": "a1"');
  });

  it('returns compact JSON for json format', () => {
    const output = formatOutput(data, 'json');
    expect(output).not.toContain('\n  ');
    expect(output).toBe('[{"uuid":"a1","name":"app","status":"running"}]');
  });

  it('renders padded markdown table for table format', () => {
    const output = formatOutput(data, 'table');
    expect(output).toContain('| uuid ');
    expect(output).toContain('| name ');
    expect(output).toContain('| a1 ');
    expect(output).toContain('+');
  });

  it('handles empty array for table format', () => {
    expect(formatOutput([], 'table')).toBe('No data available');
  });
});

describe('truncateAndGuard', () => {
  it('returns unchanged text when within max_chars', () => {
    const result = truncateAndGuard('short text', 16000);
    expect(result.truncated).toBe(false);
    expect(result.text).toBe('short text');
    expect(result.chars).toBe(10);
    expect(result.max_chars).toBe(16000);
  });

  it('truncates with recovery hint footer per D-14', () => {
    const longText = 'x'.repeat(2000);
    const result = truncateAndGuard(longText, 1000);
    expect(result.truncated).toBe(true);
    expect(result.text.length).toBeLessThanOrEqual(1000);
    expect(result.text).toContain('RESPONSE TRUNCATED');
    expect(result.text).toContain('summary projection');
    expect(result.text).toContain('lower per_page');
    expect(result.text).toContain('narrower search');
  });

  it('uses default max_chars 16000', () => {
    const result = truncateAndGuard('ok');
    expect(result.max_chars).toBe(16000);
  });
});

describe('applySizeWarning', () => {
  it('adds _size_warning when chars >= 80% of max_chars per D-16', () => {
    const maxChars = 1000;
    const threshold = Math.floor(maxChars * 0.8);
    const payload = { data: 'x'.repeat(threshold) };
    const warned = applySizeWarning(payload, threshold, maxChars);
    expect(warned._size_warning).toBeDefined();
    expect(warned._size_warning).toMatch(/80%/);
  });

  it('does not add warning below 80% threshold', () => {
    const payload = { data: 'small' };
    const warned = applySizeWarning(payload, 100, 16000);
    expect(warned._size_warning).toBeUndefined();
  });
});

describe('buildReadResponse', () => {
  it('combines formatOutput truncateAndGuard and applySizeWarning', () => {
    const data = [{ uuid: '1', name: 'test' }];
    const response = buildReadResponse(data, {
      format: 'pretty',
      max_chars: 16000,
    });
    expect(response.ok).toBe(true);
    expect(response.data).toEqual(data);
    expect(response._formattedText).toBeDefined();
    expect(response._meta).toMatchObject({
      truncated: false,
      max_chars: 16000,
    });
    expect(response._meta.chars).toBeGreaterThan(0);
  });
});
