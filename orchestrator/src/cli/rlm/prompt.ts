import { basename } from 'node:path';

import type { RlmAgentInput } from './types.js';

export function buildRlmPrompt(input: RlmAgentInput): string {
  const repoName = basename(input.repoRoot) || 'repo';
  const maxIterations = input.maxIterations === 0 ? 'unlimited' : String(input.maxIterations);

  const lines: string[] = [
    `You are Codex running an RLM loop in repo "${repoName}".`,
    `Goal: ${input.goal}`,
    `Iteration: ${input.iteration} of ${maxIterations}.`
  ];

  if (input.diffSummary) {
    lines.push('', 'Workspace summary:', input.diffSummary.trim());
  }

  if (input.lastValidatorOutput) {
    lines.push('', 'Last validator output:', input.lastValidatorOutput.trim());
  }

  if (input.validatorCommand) {
    lines.push('', `Validator command (do NOT run it): ${input.validatorCommand}`);
  } else {
    lines.push('', 'Validator: none (budgeted run)');
  }

  lines.push(
    '',
    'Instructions:',
    '- Plan and apply minimal changes toward the goal.',
    '- Use tools as needed (edit files, run commands, inspect diffs).',
    '- Do not run the validator command; it will be run after you finish.',
    '- Self-refine before finalizing (ensure changes align with goal).'
  );

  if (input.roles === 'triad') {
    if (input.subagentsEnabled) {
      lines.push('', 'Use subagents if available: Planner, Critic, Reviser.');
    }
    lines.push(
      '',
      'Role split (single response with sections):',
      'Planner: outline the plan.',
      'Critic: identify risks or missing steps.',
      'Reviser: execute the plan and summarize changes.'
    );
  }

  lines.push(
    '',
    'End your response with:',
    'Summary: <one-line summary of changes>',
    'Next: <what to try next if validator still fails>'
  );

  return lines.join('\n');
}
