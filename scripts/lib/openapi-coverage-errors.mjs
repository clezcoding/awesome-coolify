/**
 * Coverage tooling errors with maintainer-safe log messages (CodeQL js/clear-text-logging).
 */
export class CoverageError extends Error {
  /**
   * @param {string} message Thrown message (tests / stack traces).
   * @param {string} logMessage Static text safe for stderr — no config/taint interpolation.
   */
  constructor(message, logMessage) {
    super(message);
    this.name = 'CoverageError';
    this.logMessage = logMessage;
  }
}
