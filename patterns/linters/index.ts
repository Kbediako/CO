import preferLoggerOverConsole from './rules/prefer-logger-over-console.js';

export const rules = {
  'prefer-logger-over-console': preferLoggerOverConsole
} as const;

export default {
  rules
};
