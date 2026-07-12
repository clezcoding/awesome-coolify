import { describe, expect, it } from 'vitest';
import { redactSecrets } from './redact.js';

describe('redactSecrets', () => {
  it('masks Bearer JWT sequences', () => {
    const input = 'Auth failed Bearer eyJhbGciOiJIUzI1NiJ9.abc.def';
    const output = redactSecrets(input);
    expect(output).toContain('Bearer ***');
    expect(output).not.toContain('eyJ');
  });

  it('masks token= query params', () => {
    expect(redactSecrets('token=secret123')).toBe('token=***');
  });

  it('masks api_key password secret patterns', () => {
    const output = redactSecrets('api_key=abc password=xyz secret=foo');
    expect(output).toBe('api_key=*** password=*** secret=***');
  });

  it('returns plain text unchanged when no secrets', () => {
    expect(redactSecrets('hello world')).toBe('hello world');
  });
});
