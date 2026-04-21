import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { load } from 'js-yaml';
import { describe, expect, it } from 'vitest';

type PackageJson = {
  scripts?: Record<string, string | undefined>;
};

type WorkflowStep = {
  name?: unknown;
  run?: unknown;
};

type WorkflowJob = {
  steps?: unknown;
};

type WorkflowFile = {
  jobs?: Record<string, WorkflowJob>;
};

function readPackageJson(): PackageJson {
  const raw = readFileSync(join(process.cwd(), 'package.json'), 'utf8');
  return JSON.parse(raw) as PackageJson;
}

function readCoreLaneWorkflow(): WorkflowFile {
  const raw = readFileSync(join(process.cwd(), '.github', 'workflows', 'core-lane.yml'), 'utf8');
  const parsed = load(raw);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('core-lane.yml must parse as a workflow object');
  }
  return parsed as WorkflowFile;
}

function calledNpmRunScripts(command: string | undefined): string[] {
  if (!command) {
    return [];
  }

  return [...command.matchAll(/\bnpm\s+run\s+([A-Za-z0-9:_-]+)/gu)].map((match) => match[1]);
}

describe('core vs full test command contract', () => {
  it('keeps the package test scripts explicit about core and full matrices', () => {
    const scripts = readPackageJson().scripts ?? {};

    expect(scripts.test).toBe('npm run test:core --');
    expect(scripts['test:core']).toBe('vitest run --config vitest.config.core.ts');
    expect(scripts['test:all']).toBe('npm run test:core && npm run test:adapters');
    expect(scripts['test:orchestrator']).toBe('npm run test:core --');
    expect(scripts['test:evaluation']).toBe('vitest run --passWithNoTests --config vitest.config.ts evaluation/tests');
    expect(scripts['eval:test']).toBe('npm run test:evaluation --');

    const defaultMatrixCalls = calledNpmRunScripts(scripts.test);
    expect(defaultMatrixCalls, 'npm run test should stay pinned to the explicit core matrix').toEqual(['test:core']);
    expect(
      [scripts.test, scripts['test:orchestrator'], scripts['eval:test']],
      'delegating aliases must preserve npm-run argument forwarding'
    ).toEqual(['npm run test:core --', 'npm run test:core --', 'npm run test:evaluation --']);

    const fullMatrixCalls = calledNpmRunScripts(scripts['test:all']);
    expect(fullMatrixCalls, 'test:all should include the core test matrix').toContain('test:core');
    expect(
      fullMatrixCalls.some((scriptName) => scriptName !== 'test:core'),
      'test:all should expand beyond the core-only matrix'
    ).toBe(true);
  });

  it('keeps Core Lane pinned to the core matrix command', () => {
    const workflow = readCoreLaneWorkflow();
    const steps = workflow.jobs?.['core-lane']?.steps;
    const testStep = Array.isArray(steps)
      ? (steps as WorkflowStep[]).find((step) => step.run === 'npm run test:core')
      : undefined;

    expect(testStep, 'core-lane workflow must keep an explicit core-matrix test step').toBeDefined();
    expect(testStep?.name, 'core-lane Test step should advertise the explicit core matrix').toBe('Test (core matrix)');
    expect(testStep?.run, 'core-lane Test step must run the core matrix explicitly').toBe('npm run test:core');
  });
});
