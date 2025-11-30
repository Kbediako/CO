/* eslint-disable patterns/prefer-logger-over-console */
// Base logger lives at the bottom of the stack, so it writes to console directly to avoid recursive dependencies.

export interface Logger {
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
  debug(message: string, ...args: unknown[]): void;
}

const prefix = '[Codex-Orchestrator]';

function format(message: string): string {
  return `${prefix} ${message}`;
}

export const logger: Logger = {
  info(message, ...args) {
    console.info(format(message), ...args);
  },
  warn(message, ...args) {
    console.warn(format(message), ...args);
  },
  error(message, ...args) {
    console.error(format(message), ...args);
  },
  debug(message, ...args) {
    console.debug(format(message), ...args);
  }
};
