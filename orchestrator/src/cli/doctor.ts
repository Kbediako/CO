import process from 'node:process';

import {
  buildDevtoolsSetupPlan,
  DEVTOOLS_SKILL_NAME,
  resolveDevtoolsReadiness,
  type DevtoolsReadiness
} from './utils/devtools.js';
import { resolveOptionalDependency, type OptionalResolutionSource } from './utils/optionalDeps.js';

const OPTIONAL_DEPENDENCIES = [
  {
    name: 'playwright',
    install: 'npm install --save-dev playwright && npx playwright install'
  },
  { name: 'pngjs', install: 'npm install --save-dev pngjs' },
  { name: 'pixelmatch', install: 'npm install --save-dev pixelmatch' },
  { name: 'cheerio', install: 'npm install --save-dev cheerio' }
];

export interface DoctorDependencyStatus {
  name: string;
  status: 'ok' | 'missing';
  source: OptionalResolutionSource;
  install?: string;
}

export interface DoctorDevtoolsStatus {
  status: DevtoolsReadiness['status'];
  skill: {
    name: string;
    status: 'ok' | 'missing';
    path: string;
    install?: string[];
  };
  config: {
    status: 'ok' | 'missing' | 'invalid';
    path: string;
    detail?: string;
    error?: string;
    install?: string[];
  };
  enablement: string[];
}

export interface DoctorResult {
  status: 'ok' | 'warning';
  missing: string[];
  dependencies: DoctorDependencyStatus[];
  devtools: DoctorDevtoolsStatus;
}

export function runDoctor(cwd: string = process.cwd()): DoctorResult {
  const dependencies: DoctorDependencyStatus[] = OPTIONAL_DEPENDENCIES.map((entry) => {
    const resolved = resolveOptionalDependency(entry.name, cwd);
    if (resolved.path) {
      return { name: entry.name, status: 'ok', source: resolved.source };
    }
    return {
      name: entry.name,
      status: 'missing',
      source: null,
      install: entry.install
    };
  });

  const readiness = resolveDevtoolsReadiness();
  const setupPlan = buildDevtoolsSetupPlan();
  const devtools: DoctorDevtoolsStatus = {
    status: readiness.status,
    skill: {
      name: DEVTOOLS_SKILL_NAME,
      status: readiness.skill.status,
      path: readiness.skill.path,
      install:
        readiness.skill.status === 'ok'
          ? undefined
          : [
              `Copy the ${DEVTOOLS_SKILL_NAME} skill into ${setupPlan.codexHome}/skills/${DEVTOOLS_SKILL_NAME}`,
              `Expected file: ${readiness.skill.path}`
            ]
    },
    config: {
      status: readiness.config.status,
      path: readiness.config.path,
      detail: readiness.config.detail,
      error: readiness.config.error,
      install:
        readiness.config.status === 'ok'
          ? undefined
          : [
              'Run: codex-orchestrator devtools setup',
              `Run: ${setupPlan.commandLine}`,
              `Config path: ${setupPlan.configPath}`,
              'Config snippet:',
              ...setupPlan.configSnippet.split('\n')
            ]
    },
    enablement: [
      'Enable DevTools for a run with CODEX_REVIEW_DEVTOOLS=1',
      "Or run Codex with: codex -c 'mcp_servers.chrome-devtools.enabled=true' ..."
    ]
  };

  const missing = dependencies.filter((dep) => dep.status === 'missing').map((dep) => dep.name);
  if (readiness.skill.status === 'missing') {
    missing.push(DEVTOOLS_SKILL_NAME);
  }
  if (readiness.config.status !== 'ok') {
    missing.push(`${DEVTOOLS_SKILL_NAME}-config`);
  }
  return {
    status: missing.length === 0 ? 'ok' : 'warning',
    missing,
    dependencies,
    devtools
  };
}

export function formatDoctorSummary(result: DoctorResult): string[] {
  const lines: string[] = [];
  lines.push(`Status: ${result.status}`);

  for (const dep of result.dependencies) {
    if (dep.status === 'ok') {
      const source = dep.source ? ` (${dep.source})` : '';
      lines.push(`  - ${dep.name}: ok${source}`);
    } else {
      lines.push(`  - ${dep.name}: missing`);
      if (dep.install) {
        lines.push(`    install: ${dep.install}`);
      }
    }
  }

  lines.push(`DevTools: ${result.devtools.status}`);
  if (result.devtools.skill.status === 'ok') {
    lines.push(`  - ${result.devtools.skill.name}: ok (${result.devtools.skill.path})`);
  } else {
    lines.push(`  - ${result.devtools.skill.name}: missing`);
    for (const instruction of result.devtools.skill.install ?? []) {
      lines.push(`    install: ${instruction}`);
    }
  }
  if (result.devtools.config.status === 'ok') {
    lines.push(`  - config.toml: ok (${result.devtools.config.path})`);
  } else {
    const label =
      result.devtools.config.status === 'invalid'
        ? `invalid (${result.devtools.config.path})`
        : `missing (${result.devtools.config.path})`;
    lines.push(`  - config.toml: ${label}`);
    if (result.devtools.config.detail) {
      lines.push(`    detail: ${result.devtools.config.detail}`);
    }
    if (result.devtools.config.error) {
      lines.push(`    error: ${result.devtools.config.error}`);
    }
    for (const instruction of result.devtools.config.install ?? []) {
      lines.push(`    install: ${instruction}`);
    }
  }
  for (const line of result.devtools.enablement) {
    lines.push(`  - ${line}`);
  }

  return lines;
}
