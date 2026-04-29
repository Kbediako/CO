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
    expect(
      classifyCommandIntentCommandLine(`python -m pytest tests/review-execution-state.spec.ts`, {
        allowValidationCommandIntents: false
      })
    ).toEqual({
      kind: 'validation-runner',
      sample: `python -m pytest tests/review-execution-state.spec.ts`
    });
    expect(
      classifyCommandIntentCommandLine(`python -W ignore -m pytest tests/review-execution-state.spec.ts`, {
        allowValidationCommandIntents: false
      })
    ).toEqual({
      kind: 'validation-runner',
      sample: `python -W ignore -m pytest tests/review-execution-state.spec.ts`
    });
    expect(
      classifyCommandIntentCommandLine(
        `python --check-hash-based-pycs=default -m pytest tests/review-execution-state.spec.ts`,
        {
          allowValidationCommandIntents: false
        }
      )
    ).toEqual({
      kind: 'validation-runner',
      sample: `python --check-hash-based-pycs=default -m pytest tests/review-execution-state.spec.ts`
    });
    expect(
      classifyCommandIntentCommandLine(`python tool.py -m pytest`, {
        allowValidationCommandIntents: false
      })
    ).toBeNull();
  });

  it('keeps package-manager test-file selectors inside the validation-suite boundary', () => {
    expect(
      classifyCommandIntentCommandLine(`npm test -- --runInBand tests/run-review.spec.ts`, {
        allowValidationCommandIntents: false
      })
    ).toEqual({
      kind: 'validation-suite',
      sample: `npm test -- --runInBand tests/run-review.spec.ts`
    });
    expect(
      classifyCommandIntentCommandLine(`pnpm run test -- tests/review-execution-state.spec.ts`, {
        allowValidationCommandIntents: false
      })
    ).toEqual({
      kind: 'validation-suite',
      sample: `pnpm run test -- tests/review-execution-state.spec.ts`
    });
    expect(
      classifyCommandIntentCommandLine(`npm run docs:freshness:maintain -- --format json`, {
        allowValidationCommandIntents: false
      })
    ).toEqual({
      kind: 'validation-suite',
      sample: `npm run docs:freshness:maintain -- --format json`
    });
  });

  it('classifies CO repo-local validation aliases and guard scripts as validation suites', () => {
    for (const commandLine of [
      `npm run test:core -- tests/spec-guard.spec.ts`,
      `npm run test:orchestrator -- orchestrator/tests/ProviderLinearWorkerRunner.test.ts --runInBand`,
      `pnpm run test:adapters -- --passWithNoTests`,
      `npm run eval:test -- evaluation/tests/sample.spec.ts`,
      `node --run test:core -- tests/spec-guard.spec.ts`,
      `node scripts/run-test-all.mjs -- tests/spec-guard.spec.ts`,
      `node scripts/spec-guard.mjs --dry-run`,
      `node scripts/diff-budget.mjs`,
      `scripts/spec-guard.mjs --dry-run`
    ]) {
      expect(
        classifyCommandIntentCommandLine(commandLine, {
          allowValidationCommandIntents: false
        })
      ).toEqual({
        kind: 'validation-suite',
        sample: commandLine
      });
    }

    expect(
      classifyCommandIntentCommandLine(
        `/bin/zsh -lc 'tmp="$(mktemp -d)" && cd "$tmp" && node /Users/kbediako/Code/CO/scripts/spec-guard.mjs --dry-run'`,
        {
          allowValidationCommandIntents: false
        }
      )
    ).toEqual({
      kind: 'validation-suite',
      sample: `node /Users/kbediako/Code/CO/scripts/spec-guard.mjs --dry-run`
    });
  });

  it('keeps help-only repo-local validation script lookups outside the boundary', () => {
    for (const commandLine of [
      `node scripts/spec-guard.mjs --help`,
      `node scripts/spec-guard.mjs -h`,
      `node scripts/spec-guard.mjs help`,
      `node scripts/spec-guard.mjs -- --help`,
      `node scripts/diff-budget.mjs --help`,
      `node scripts/delegation-guard.mjs --help`,
      `node scripts/docs-freshness.mjs --check --help`,
      `node scripts/docs-freshness-maintain.mjs --check --help`,
      `node scripts/repo-stewardship-audit.mjs --check --help`,
      `node scripts/spec-guard.mjs --help=false --help`,
      `scripts/spec-guard.mjs --help`,
      `scripts/spec-guard.mjs -h`,
      `scripts/spec-guard.mjs help`,
      `node --run docs:freshness -- --help`,
      `node --run docs:freshness -- --help=false --help`,
      `node --run=docs:freshness -- --help`,
      `node --run docs:freshness:maintain -- --help`,
      `node --run repo:stewardship -- --help`
    ]) {
      expect(
        classifyCommandIntentCommandLine(commandLine, {
          allowValidationCommandIntents: false
        })
      ).toBeNull();
    }
  });

  it('keeps validation targets that do not stop at help inside the boundary', () => {
    for (const commandLine of [
      `node scripts/run-test-all.mjs --help`,
      `node scripts/pack-smoke.mjs --help`,
      `scripts/run-test-all.mjs --help`,
      `scripts/pack-smoke.mjs --help`,
      `node --run test:all -- --help`,
      `node --run test:core -- --help`,
      `node --run pack:smoke -- --help`,
      `node --run docs:check -- --help`,
      `node --run docs:freshness -- help`,
      `node --run=docs:freshness -- help`,
      `node --run docs:freshness:maintain -- help`,
      `node --run repo:stewardship -- help`
    ]) {
      expect(
        classifyCommandIntentCommandLine(commandLine, {
          allowValidationCommandIntents: false
        })
      ).toEqual({
        kind: 'validation-suite',
        sample: commandLine
      });
    }
  });

  it('keeps disabled help flags on validation targets inside the boundary', () => {
    for (const commandLine of [
      `node scripts/spec-guard.mjs --help=false`,
      `node scripts/spec-guard.mjs --help=false=1`,
      `node scripts/spec-guard.mjs --help=0`,
      `node scripts/spec-guard.mjs --help=0=1`,
      `node scripts/spec-guard.mjs -h=false`,
      `node scripts/spec-guard.mjs -h=false=1`,
      `node scripts/spec-guard.mjs --help false`,
      `node scripts/spec-guard.mjs --help --help=false`,
      `node scripts/spec-guard.mjs -h -h=false`,
      `node scripts/docs-freshness.mjs --check --help=false`,
      `node scripts/docs-freshness.mjs --check --help=false=1`,
      `node scripts/docs-freshness.mjs --check --help --help=false`,
      `node --run docs:freshness -- --help=false`,
      `node --run docs:freshness -- --help=false=1`,
      `node --run docs:freshness -- --help --help=false`,
      `node --run docs:freshness:maintain -- --help=0`,
      `node --run docs:freshness:maintain -- --help=0=1`,
      `node --run repo:stewardship -- --help false`
    ]) {
      expect(
        classifyCommandIntentCommandLine(commandLine, {
          allowValidationCommandIntents: false
        })
      ).toEqual({
        kind: 'validation-suite',
        sample: commandLine
      });
    }
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
    expect(
      classifyCommandIntentCommandLine(`codex-orchestrator start --task sample-task implementation-gate`, {
        allowValidationCommandIntents: false
      })?.kind
    ).toBe('review-orchestration');
    expect(
      classifyCommandIntentCommandLine(`codex-orchestrator start --task diagnostics non-review`, {
        allowValidationCommandIntents: false
      })
    ).toBeNull();
    expect(
      classifyCommandIntentCommandLine(`codex review --uncommitted`, {
        allowValidationCommandIntents: false
      })?.kind
    ).toBe('review-orchestration');
  });

  it('keeps help-only review orchestration lookups outside the command-intent boundary', () => {
    for (const commandLine of [
      `codex review --help`,
      `codex review -h`,
      `codex-orchestrator review --help`,
      `codex-orchestrator start docs-review --help`,
      `codex-orchestrator start --help docs-review`,
      `codex-orchestrator start -h docs-review`,
      `codex-orchestrator start --task sample-task docs-review --help`,
      `node scripts/run-review.ts --help`,
      `npm run review -- --help`,
      `/bin/zsh -lc 'codex --help; codex review --help'`
    ]) {
      expect(
        classifyCommandIntentCommandLine(commandLine, {
          allowValidationCommandIntents: false
        })
      ).toBeNull();
    }
  });

  it('does not treat help argument values as help-only review orchestration lookups', () => {
    for (const commandLine of [
      `codex review --title help --uncommitted`,
      `codex review help`,
      `codex review --title foo help`,
      `codex-orchestrator review --title=help --manifest x`,
      `node scripts/run-review.ts --title help`,
      `npm run review help`,
      `npm run review -- help`,
      `npm run review -- --title help`,
      `npm run review -- --title foo help`
    ]) {
      expect(
        classifyCommandIntentCommandLine(commandLine, {
          allowValidationCommandIntents: false
        })?.kind
      ).toBe('review-orchestration');
    }
  });

  it('does not treat post-separator help-looking prompt text as help-only review orchestration', () => {
    for (const commandLine of [
      `codex review -- --help`,
      `codex review -- --help --uncommitted`,
      `npm run review -- -- --help`
    ]) {
      expect(
        classifyCommandIntentCommandLine(commandLine, {
          allowValidationCommandIntents: false
        })?.kind
      ).toBe('review-orchestration');
    }
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
        String.raw`.\bin\codex-orchestrator review --manifest x`,
        { allowValidationCommandIntents: false }
      )
    ).toEqual({
      kind: 'review-orchestration',
      sample: String.raw`./bin/codex-orchestrator review --manifest x`
    });

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
        String.raw`bin\codex-orchestrator review --manifest x`,
        { allowValidationCommandIntents: false }
      )
    ).toEqual({
      kind: 'review-orchestration',
      sample: String.raw`bin/codex-orchestrator review --manifest x`
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
        String.raw`cmd /C ".\bin\codex-orchestrator review --manifest x"`,
        { allowValidationCommandIntents: false }
      )
    ).toEqual({
      kind: 'review-orchestration',
      sample: String.raw`./bin/codex-orchestrator review --manifest x`
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

    expect(
      classifyCommandIntentCommandLine(
        String.raw`cmd /C "bin\codex-orchestrator review --manifest x"`,
        { allowValidationCommandIntents: false }
      )
    ).toEqual({
      kind: 'review-orchestration',
      sample: String.raw`bin/codex-orchestrator review --manifest x`
    });

    expect(
      classifyCommandIntentCommandLine(
        String.raw`cmd /C "node scripts\run-review.js --manifest x"`,
        { allowValidationCommandIntents: false }
      )
    ).toEqual({
      kind: 'review-orchestration',
      sample: String.raw`node scripts/run-review.js --manifest x`
    });

    expect(
      classifyCommandIntentCommandLine(
        String.raw`cmd /C "node scripts\run-review.ts --manifest x"`,
        { allowValidationCommandIntents: false }
      )
    ).toEqual({
      kind: 'review-orchestration',
      sample: String.raw`node scripts/run-review.ts --manifest x`
    });

    expect(
      classifyCommandIntentCommandLine(
        String.raw`cmd /C "node scripts\run-review.{js,ts} --manifest x"`,
        { allowValidationCommandIntents: false }
      )
    ).toEqual({
      kind: 'review-orchestration',
      sample: String.raw`node scripts/run-review.{js,ts} --manifest x`
    });

    expect(
      classifyCommandIntentCommandLine(
        String.raw`echo prep&&.\bin\codex-orchestrator review --manifest x`,
        { allowValidationCommandIntents: false }
      )
    ).toEqual({
      kind: 'review-orchestration',
      sample: String.raw`./bin/codex-orchestrator review --manifest x`
    });

    expect(
      classifyCommandIntentCommandLine(
        String.raw`cmd /C "echo prep&&.\bin\codex-orchestrator review --manifest x"`,
        { allowValidationCommandIntents: false }
      )
    ).toEqual({
      kind: 'review-orchestration',
      sample: String.raw`./bin/codex-orchestrator review --manifest x`
    });

    expect(
      classifyCommandIntentCommandLine(
        String.raw`echo prep&&node_modules\.bin\vitest run tests/review-execution-state.spec.ts`,
        { allowValidationCommandIntents: false }
      )
    ).toEqual({
      kind: 'validation-runner',
      sample: String.raw`node_modules/.bin/vitest run tests/review-execution-state.spec.ts`
    });

    expect(
      classifyCommandIntentCommandLine(
        String.raw`venv\Scripts\pytest tests/review-execution-state.spec.ts`,
        { allowValidationCommandIntents: false }
      )
    ).toEqual({
      kind: 'validation-runner',
      sample: String.raw`venv/Scripts/pytest tests/review-execution-state.spec.ts`
    });

    expect(
      classifyCommandIntentCommandLine(
        String.raw`venv\Scripts\python -m pytest tests/review-execution-state.spec.ts`,
        { allowValidationCommandIntents: false }
      )
    ).toEqual({
      kind: 'validation-runner',
      sample: String.raw`venv/Scripts/python -m pytest tests/review-execution-state.spec.ts`
    });

    expect(
      classifyCommandIntentCommandLine(
        String.raw`cmd /C "echo prep&&node_modules\.bin\vitest run tests/review-execution-state.spec.ts"`,
        { allowValidationCommandIntents: false }
      )
    ).toEqual({
      kind: 'validation-runner',
      sample: String.raw`node_modules/.bin/vitest run tests/review-execution-state.spec.ts`
    });

    expect(
      classifyCommandIntentCommandLine(
        String.raw`cmd /C "venv\Scripts\pytest tests/review-execution-state.spec.ts"`,
        { allowValidationCommandIntents: false }
      )
    ).toEqual({
      kind: 'validation-runner',
      sample: String.raw`venv/Scripts/pytest tests/review-execution-state.spec.ts`
    });

    expect(
      classifyCommandIntentCommandLine(
        String.raw`cmd /C "venv\Scripts\python -m pytest tests/review-execution-state.spec.ts"`,
        { allowValidationCommandIntents: false }
      )
    ).toEqual({
      kind: 'validation-runner',
      sample: String.raw`venv/Scripts/python -m pytest tests/review-execution-state.spec.ts`
    });
  });

  it('only treats the Node entry script as the review runner target', () => {
    expect(
      classifyCommandIntentCommandLine(`node scripts/tool.js run-review.{js,ts}`, {
        allowValidationCommandIntents: false
      })
    ).toBeNull();

    expect(
      classifyCommandIntentCommandLine(`node --require tsx scripts/run-review.ts --manifest x`, {
        allowValidationCommandIntents: false
      })
    ).toEqual({
      kind: 'review-orchestration',
      sample: `node --require tsx scripts/run-review.ts --manifest x`
    });
    expect(
      classifyCommandIntentCommandLine(`node -C development scripts/run-review.ts --manifest x`, {
        allowValidationCommandIntents: false
      })
    ).toEqual({
      kind: 'review-orchestration',
      sample: `node -C development scripts/run-review.ts --manifest x`
    });
    expect(
      classifyCommandIntentCommandLine(`node --inspect-port 9229 scripts/run-review.ts --manifest x`, {
        allowValidationCommandIntents: false
      })
    ).toEqual({
      kind: 'review-orchestration',
      sample: `node --inspect-port 9229 scripts/run-review.ts --manifest x`
    });
    expect(
      classifyCommandIntentCommandLine(`node --watch scripts/run-review.ts --manifest x`, {
        allowValidationCommandIntents: false
      })
    ).toEqual({
      kind: 'review-orchestration',
      sample: `node --watch scripts/run-review.ts --manifest x`
    });
    expect(
      classifyCommandIntentCommandLine(`node --run review`, {
        allowValidationCommandIntents: false
      })
    ).toEqual({
      kind: 'review-orchestration',
      sample: `node --run review`
    });
    expect(
      classifyCommandIntentCommandLine(`node --run=review`, {
        allowValidationCommandIntents: false
      })
    ).toEqual({
      kind: 'review-orchestration',
      sample: `node --run=review`
    });
  });
});
