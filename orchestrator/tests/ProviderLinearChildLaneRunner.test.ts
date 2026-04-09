import { describe, expect, it } from 'vitest';

import { __test__ as childLaneRunnerTest } from '../src/cli/providerLinearChildLaneRunner.js';

describe('provider linear child lane runner', () => {
  it('includes shared source 0 anchor lines in the child-lane prompt when present', () => {
    const prompt = childLaneRunnerTest.buildChildLanePrompt({
      issueIdentifier: 'CO-91',
      purpose: 'Exercise the shared source-0 anchor',
      scope: {
        files: ['orchestrator/src/cli/run/source0.ts'],
        phases: ['implementation']
      },
      source0PromptLines: [
        'Shared source 0 anchor:',
        '- Pointer: `ctx:sha256:source0#chunk:c000001`',
        '- Source payload: `.runs/linear-lin-issue-1/cli/run-child/memory/source-0/source.txt`'
      ],
      instructions: null
    });

    expect(prompt).toContain('You are a bounded same-issue child lane for Linear issue CO-91.');
    expect(prompt).toContain('Shared source 0 anchor:');
    expect(prompt).toContain('- Pointer: `ctx:sha256:source0#chunk:c000001`');
    expect(prompt).toContain(
      '- Source payload: `.runs/linear-lin-issue-1/cli/run-child/memory/source-0/source.txt`'
    );
  });
});
