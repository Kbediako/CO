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

  it('does not treat quoted rg regex alternation as nested review orchestration', () => {
    expect(
      classifyCommandIntentCommandLine(
        String.raw`/bin/zsh -lc "rg -n \"execRunner\\(|run review|npm run review|codex-orchestrator review|FORCE_CODEX_REVIEW\" orchestrator/src/cli/providerLinearWorkerRunner.ts | sed -n '1,200p' && echo '---' && sed -n '840,980p' orchestrator/src/cli/providerLinearWorkerRunner.ts"`,
        { allowValidationCommandIntents: false }
      )
    ).toBeNull();
  });

  it('keeps Windows launcher paths classifiable for review and validation boundaries', () => {
    expect(
      classifyCommandIntentCommandLine(
        String.raw`C:\Users\me\AppData\Roaming\npm\codex-orchestrator.cmd review --manifest x`,
        { allowValidationCommandIntents: false }
      )
    ).toEqual({
      kind: 'review-orchestration',
      sample: String.raw`C:/Users/me/AppData/Roaming/npm/codex-orchestrator.cmd review --manifest x`
    });

    expect(
      classifyCommandIntentCommandLine(
        String.raw`C:\Users\me\AppData\Roaming\npm\npx.cmd vitest run tests/review-execution-state.spec.ts`,
        { allowValidationCommandIntents: false }
      )
    ).toEqual({
      kind: 'validation-runner',
      sample: String.raw`C:/Users/me/AppData/Roaming/npm/npx.cmd vitest run tests/review-execution-state.spec.ts`
    });
  });

  it('keeps relative Windows launcher paths classifiable for review and validation boundaries', () => {
    expect(
      classifyCommandIntentCommandLine(
        String.raw`.\bin\codex-orchestrator.cmd review --manifest x`,
        { allowValidationCommandIntents: false }
      )
    ).toEqual({
      kind: 'review-orchestration',
      sample: String.raw`./bin/codex-orchestrator.cmd review --manifest x`
    });

    expect(
      classifyCommandIntentCommandLine(
        String.raw`node_modules\.bin\vitest.cmd run tests/review-execution-state.spec.ts`,
        { allowValidationCommandIntents: false }
      )
    ).toEqual({
      kind: 'validation-runner',
      sample: String.raw`node_modules/.bin/vitest.cmd run tests/review-execution-state.spec.ts`
    });

    expect(
      classifyCommandIntentCommandLine(
        String.raw`".\bin\codex-orchestrator.cmd" review --manifest x`,
        { allowValidationCommandIntents: false }
      )
    ).toEqual({
      kind: 'review-orchestration',
      sample: String.raw`"./bin/codex-orchestrator.cmd" review --manifest x`
    });

    expect(
      classifyCommandIntentCommandLine(
        String.raw`"node_modules\.bin\vitest.cmd" run tests/review-execution-state.spec.ts`,
        { allowValidationCommandIntents: false }
      )
    ).toEqual({
      kind: 'validation-runner',
      sample: String.raw`"node_modules/.bin/vitest.cmd" run tests/review-execution-state.spec.ts`
    });

    expect(
      classifyCommandIntentCommandLine(
        String.raw`/bin/zsh -lc '".\bin\codex-orchestrator.cmd" review --manifest x'`,
        { allowValidationCommandIntents: false }
      )
    ).toEqual({
      kind: 'review-orchestration',
      sample: String.raw`"./bin/codex-orchestrator.cmd" review --manifest x`
    });

    expect(
      classifyCommandIntentCommandLine(
        String.raw`/bin/zsh -lc '"node_modules\.bin\vitest.cmd" run tests/review-execution-state.spec.ts'`,
        { allowValidationCommandIntents: false }
      )
    ).toEqual({
      kind: 'validation-runner',
      sample: String.raw`"node_modules/.bin/vitest.cmd" run tests/review-execution-state.spec.ts`
    });

    expect(
      classifyCommandIntentCommandLine(
        String.raw`cmd /C ".\bin\codex-orchestrator.cmd review --manifest x"`,
        { allowValidationCommandIntents: false }
      )
    ).toEqual({
      kind: 'review-orchestration',
      sample: String.raw`./bin/codex-orchestrator.cmd review --manifest x`
    });

    expect(
      classifyCommandIntentCommandLine(
        String.raw`cmd /C "node_modules\.bin\vitest.cmd run tests/review-execution-state.spec.ts"`,
        { allowValidationCommandIntents: false }
      )
    ).toEqual({
      kind: 'validation-runner',
      sample: String.raw`node_modules/.bin/vitest.cmd run tests/review-execution-state.spec.ts`
    });
  });
});
