import { describe, expect, it, vi, afterEach } from 'vitest';
import { createLogger } from './logger.js';

describe('createLogger', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('debug writes to console.error only when level is debug', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    createLogger('info').debug('hidden');
    expect(errorSpy).not.toHaveBeenCalled();

    createLogger('debug').debug('visible');
    expect(errorSpy).toHaveBeenCalledWith('[DEBUG] visible');
    expect(logSpy).not.toHaveBeenCalled();
  });

  it('info writes when level is debug or info', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    createLogger('info').info('info-msg');
    createLogger('debug').info('debug-info');
    createLogger('error').info('hidden-info');

    expect(errorSpy).toHaveBeenCalledTimes(2);
  });

  it('error always writes to console.error', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    createLogger('error').error('fail');
    expect(errorSpy).toHaveBeenCalledWith('[ERROR] fail');
  });

  it('httpDebug logs path and status only', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    createLogger('debug').httpDebug('/api/v1/version', 200);
    expect(errorSpy).toHaveBeenCalledWith('[DEBUG] /api/v1/version 200');
  });
});
