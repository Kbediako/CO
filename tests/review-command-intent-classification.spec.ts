import { describe, expect, it } from 'vitest';

import {
  classifyCommandIntentCommandLine,
  classifyCommandIntentToolLine,
  formatCommandIntentViolationLabel
} from '../scripts/lib/review-command-intent-classification.js';

describe('review command intent classification', () => {
  it('normalizes review execution suffixes before classifying validation runners', () => {
    expect(
      classifyCommandIntentCommandLine(
        `/bin/zsh -lc 'npx vitest run tests/review-execution-state.spec.ts' succeeded in 12ms`,
        {
          allowValidationCommandIntents: false
        }
      )
    ).toEqual({
      kind: 'validation-runner',
      sample: `npx vitest run tests/review-execution-state.spec.ts`
    });
    expect(formatCommandIntentViolationLabel('validation-runner')).toBe(
      'direct validation runner launch'
    );
  });

  it('keeps delegation status tool lines read-only while classifying mutating delegation control', () => {
    expect(classifyCommandIntentToolLine(`tool delegation.delegate.status({"pipeline":"docs-review"})`)).toBeNull();
    expect(
      classifyCommandIntentToolLine(`tool delegation.delegate.spawn({"pipeline":"docs-review"})`)
    ).toEqual({
      kind: 'delegation-control',
      sample: `tool delegation.delegate.spawn({"pipeline":"docs-review"})`
    });
  });

  it('does not classify typecheck and check scripts as validation-suite intents', () => {
    expect(classifyCommandIntentCommandLine(`npm run typecheck`, { allowValidationCommandIntents: false })).toBeNull();
    expect(classifyCommandIntentCommandLine(`pnpm run check`, { allowValidationCommandIntents: false })).toBeNull();
  });

  it('resolves launcher variants and nested review-orchestration commands', () => {
    expect(
      classifyCommandIntentCommandLine(
        `npm exec -- vitest run tests/review-execution-state.spec.ts`,
        { allowValidationCommandIntents: false }
      )?.kind
    ).toBe('validation-runner');
    expect(
      classifyCommandIntentCommandLine(
        `bunx jest tests/review-execution-state.spec.ts`,
        { allowValidationCommandIntents: false }
      )?.kind
    ).toBe('validation-runner');
    expect(
      classifyCommandIntentCommandLine(`codex-orchestrator start diagnostics --task sample-task`, {
        allowValidationCommandIntents: false
      })?.kind
    ).toBe('review-orchestration');
  });
});
