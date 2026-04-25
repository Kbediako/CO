import { readFile } from 'node:fs/promises';

import { load } from 'js-yaml';
import { describe, expect, it } from 'vitest';

type WorkflowStep = {
  env?: Record<string, unknown>;
  if?: string;
  name?: string;
  run?: string;
  uses?: string;
  with?: Record<string, unknown>;
};

type WorkflowJob = {
  permissions?: Record<string, unknown>;
  steps?: WorkflowStep[];
};

type WorkflowFile = {
  jobs?: Record<string, WorkflowJob>;
  on?: Record<string, unknown>;
};

async function readWorkflow(path: string): Promise<WorkflowFile> {
  const parsed = load(await readFile(path, 'utf8'));
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`${path} must parse as a workflow object`);
  }
  return parsed as WorkflowFile;
}

function getStep(workflow: WorkflowFile, jobName: string, stepName: string): WorkflowStep {
  const steps = workflow.jobs?.[jobName]?.steps ?? [];
  const step = steps.find((candidate) => candidate.name === stepName);
  if (!step) {
    throw new Error(`Missing workflow step ${jobName} / ${stepName}`);
  }
  return step;
}

describe('archive automation workflow required checks', () => {
  it('exposes Core Lane as a dispatchable required-check workflow for archive PR heads', async () => {
    const workflow = await readWorkflow('.github/workflows/core-lane.yml');

    expect(workflow.on?.pull_request).toEqual({ branches: ['main'] });
    expect(workflow.on?.push).toEqual({ branches: ['main'] });
    expect(workflow.on?.workflow_dispatch).toMatchObject({
      inputs: {
        archive_pr_number: {
          required: true,
          type: 'string'
        },
        archive_pr_branch: {
          required: true,
          type: 'string'
        },
        archive_pr_head_sha: {
          required: true,
          type: 'string'
        }
      }
    });

    const validationStep = getStep(workflow, 'core-lane', 'Validate archive PR dispatch inputs');
    expect(validationStep.if).toContain("github.event_name == 'workflow_dispatch'");
    expect(validationStep.env).toMatchObject({
      ARCHIVE_PR_NUMBER: '${{ inputs.archive_pr_number }}',
      ARCHIVE_PR_BRANCH: '${{ inputs.archive_pr_branch }}',
      ARCHIVE_PR_HEAD_SHA: '${{ inputs.archive_pr_head_sha }}'
    });
    expect(validationStep.run).toContain(
      'workflow_dispatch requires archive_pr_number, archive_pr_branch, and archive_pr_head_sha'
    );
    expect(validationStep.run).toContain('archive_pr_number must be a positive integer');
    expect(validationStep.run).toContain('archive_pr_head_sha must be a 40-character commit SHA');
    expect(validationStep.run).toContain('automation/tasks-archive|automation/implementation-docs-archive');
    expect(validationStep.run).toContain('archive_pr_branch (${ARCHIVE_PR_BRANCH}) does not match dispatched ref');
    expect(validationStep.run).toContain('does not match the dispatched ref');
    expect(validationStep.run).toContain('${GITHUB_SHA,,}');

    const baseStep = getStep(workflow, 'core-lane', 'Set BASE_SHA from archive PR dispatch');
    expect(baseStep.if).toContain("github.event_name == 'workflow_dispatch'");
    expect(baseStep.env).toMatchObject({
      GH_TOKEN: '${{ github.token }}',
      PR_NUMBER: '${{ inputs.archive_pr_number }}',
      PR_BRANCH: '${{ inputs.archive_pr_branch }}',
      PR_HEAD_SHA: '${{ inputs.archive_pr_head_sha }}'
    });
    expect(baseStep.run).toContain('gh api "repos/${{ github.repository }}/pulls/${PR_NUMBER}"');
    expect(baseStep.run).toContain('.state');
    expect(baseStep.run).toContain('.base.ref');
    expect(baseStep.run).toContain('.head.sha');
    expect(baseStep.run).toContain('.head.repo.full_name');
    expect(baseStep.run).toContain('.head.ref');
    expect(baseStep.run).toContain('must be open');
    expect(baseStep.run).toContain('must be main');
    expect(baseStep.run).toContain('does not match archive_pr_head_sha');
    expect(baseStep.run).toContain('does not match ${GITHUB_REPOSITORY}');
    expect(baseStep.run).toContain('does not match archive_pr_branch');
    expect(baseStep.run).toContain('does not match dispatched ref');

    const diffBudgetStep = getStep(workflow, 'core-lane', 'Diff budget');
    expect(diffBudgetStep.if).toContain("github.event_name == 'pull_request'");
    expect(diffBudgetStep.if).toContain("github.event_name == 'workflow_dispatch'");
    expect(diffBudgetStep.if).not.toContain('inputs.archive_pr_number');

    const overrideStep = getStep(workflow, 'core-lane', 'Resolve diff-budget override (label + reason)');
    expect(overrideStep.if).toContain("github.event_name == 'pull_request'");
    expect(overrideStep.if).toContain("github.event_name == 'workflow_dispatch'");
    expect(overrideStep.if).not.toContain('inputs.archive_pr_number');
    expect(overrideStep.env).toMatchObject({
      ARCHIVE_PR_NUMBER: "${{ github.event_name == 'workflow_dispatch' && inputs.archive_pr_number || '' }}"
    });
    expect(overrideStep.run).toContain('ARCHIVE_PR_NUMBER');
  });

  it('dispatches Core Lane after creating or updating an archive PR', async () => {
    const workflow = await readWorkflow('.github/workflows/archive-automation-base.yml');
    expect(workflow.jobs?.archive?.permissions).toMatchObject({
      actions: 'write',
      contents: 'write',
      'pull-requests': 'write'
    });

    const dispatchStep = getStep(workflow, 'archive', 'Dispatch Core Lane for archive PR');

    expect(dispatchStep.if).toContain("steps.changes.outputs.changed == 'true'");
    expect(dispatchStep.if).toContain("steps.cpr.outputs.pull-request-number != ''");
    expect(dispatchStep.env).toMatchObject({
      GH_TOKEN: '${{ github.token }}',
      GH_REPO: '${{ github.repository }}',
      PR_BRANCH: '${{ inputs.pr_branch }}',
      PR_HEAD_SHA: '${{ steps.cpr.outputs.pull-request-head-sha }}',
      PR_NUMBER: '${{ steps.cpr.outputs.pull-request-number }}'
    });
    expect(dispatchStep.run).toContain('set -euo pipefail');
    expect(dispatchStep.run).toContain('gh workflow run core-lane.yml');
    expect(dispatchStep.run).toContain('--ref "${PR_BRANCH}"');
    expect(dispatchStep.run).toContain('-f "archive_pr_number=${PR_NUMBER}"');
    expect(dispatchStep.run).toContain('-f "archive_pr_branch=${PR_BRANCH}"');
    expect(dispatchStep.run).toContain('-f "archive_pr_head_sha=${PR_HEAD_SHA}"');
    expect(dispatchStep.run).toContain('Archive PR branch input or create-pull-request head SHA is missing');
  });

  it('grants reusable archive callers permission to dispatch Core Lane', async () => {
    const taskArchive = await readWorkflow('.github/workflows/tasks-archive-automation.yml');
    const docsArchive = await readWorkflow('.github/workflows/implementation-docs-archive-automation.yml');

    for (const workflow of [taskArchive, docsArchive]) {
      expect(workflow.jobs?.archive?.permissions).toMatchObject({
        actions: 'write',
        contents: 'write',
        'pull-requests': 'write'
      });
    }
  });
});
