import { describe, expect, it } from 'vitest';
import { Linter } from 'eslint';
import parser from '@typescript-eslint/parser';
import rule from '../rules/prefer-logger-over-console.js';

function createLinter(): Linter {
  const linter = new Linter();
  linter.defineParser('@typescript-eslint/parser', parser as unknown as Linter.ParserModule);
  linter.defineRule('patterns/prefer-logger-over-console', rule);
  return linter;
}

const config: Linter.Config = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module'
  },
  rules: {
    'patterns/prefer-logger-over-console': 'error'
  }
};

describe('prefer-logger-over-console rule', () => {
  it('reports console usage', () => {
    const linter = createLinter();
    const messages = linter.verify('console.log("hi")', config, 'sample.ts');
    expect(messages).toHaveLength(1);
    expect(messages[0]?.messageId).toBe('preferLogger');
  });

  it('allows logger usage', () => {
    const linter = createLinter();
    const messages = linter.verify('logger.info("ok")', config, 'sample.ts');
    expect(messages).toHaveLength(0);
  });

  it('ignores unsupported console methods', () => {
    const linter = createLinter();
    const messages = linter.verify('console.trace("debug")', config, 'sample.ts');
    expect(messages).toHaveLength(0);
  });
});
