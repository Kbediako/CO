import { spawn } from 'node:child_process';
import process from 'node:process';

import {
  buildDevtoolsSetupPlan,
  resolveDevtoolsReadiness,
  type DevtoolsReadiness,
  type DevtoolsSetupPlan
} from './utils/devtools.js';

export interface DevtoolsSetupOptions {
  apply?: boolean;
  env?: NodeJS.ProcessEnv;
}

export interface DevtoolsSetupResult {
  status: 'planned' | 'applied' | 'skipped';
  reason?: string;
  plan: DevtoolsSetupPlan;
  readiness: DevtoolsReadiness;
}

export async function runDevtoolsSetup(options: DevtoolsSetupOptions = {}): Promise<DevtoolsSetupResult> {
  const env = options.env ?? process.env;
  const plan = buildDevtoolsSetupPlan(env);
  const readiness = resolveDevtoolsReadiness(env);

  if (!options.apply) {
    return { status: 'planned', plan, readiness };
  }

  if (readiness.config.status === 'ok') {
    return {
      status: 'skipped',
      reason: 'DevTools MCP is already configured.',
      plan,
      readiness
    };
  }

  if (readiness.config.status === 'invalid') {
    throw new Error(
      `Cannot apply DevTools setup because config.toml is invalid: ${readiness.config.path}`
    );
  }

  await applyDevtoolsSetup(plan, env);
  const readinessAfter = resolveDevtoolsReadiness(env);
  return { status: 'applied', plan, readiness: readinessAfter };
}

export function formatDevtoolsSetupSummary(result: DevtoolsSetupResult): string[] {
  const lines: string[] = [];
  lines.push(`DevTools setup: ${result.status}`);
  if (result.reason) {
    lines.push(`Note: ${result.reason}`);
  }

  lines.push(`- Codex home: ${result.plan.codexHome}`);
  lines.push(`- Skill: ${result.readiness.skill.status} (${result.readiness.skill.path})`);

  const configLabel =
    result.readiness.config.status === 'invalid'
      ? `invalid (${result.readiness.config.path})`
      : `${result.readiness.config.status} (${result.readiness.config.path})`;
  lines.push(`- Config: ${configLabel}`);
  if (result.readiness.config.detail) {
    lines.push(`  detail: ${result.readiness.config.detail}`);
  }
  if (result.readiness.config.error) {
    lines.push(`  error: ${result.readiness.config.error}`);
  }

  lines.push(`- Command: ${result.plan.commandLine}`);
  lines.push('- Config snippet:');
  for (const line of result.plan.configSnippet.split('\n')) {
    lines.push(`  ${line}`);
  }

  if (result.status === 'planned') {
    lines.push('Run with --yes to apply this setup.');
  }

  return lines;
}

async function applyDevtoolsSetup(plan: DevtoolsSetupPlan, env: NodeJS.ProcessEnv): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(plan.command, plan.args, { stdio: 'inherit', env });
    child.once('error', (error) => reject(error instanceof Error ? error : new Error(String(error))));
    child.once('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`codex mcp add exited with code ${code ?? 'unknown'}`));
      }
    });
  });
}
