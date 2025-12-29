import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';

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

const DEVTOOLS_SKILL_NAME = 'chrome-devtools';

export interface DoctorDependencyStatus {
  name: string;
  status: 'ok' | 'missing';
  source: OptionalResolutionSource;
  install?: string;
}

export interface DoctorDevtoolsStatus {
  status: 'ok' | 'missing';
  skill: {
    name: string;
    status: 'ok' | 'missing';
    path: string;
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

  const codexHome = resolveCodexHome();
  const skillPath = join(codexHome, 'skills', DEVTOOLS_SKILL_NAME, 'SKILL.md');
  const skillInstalled = existsSync(skillPath);
  const devtools: DoctorDevtoolsStatus = {
    status: skillInstalled ? 'ok' : 'missing',
    skill: {
      name: DEVTOOLS_SKILL_NAME,
      status: skillInstalled ? 'ok' : 'missing',
      path: skillPath,
      install: skillInstalled
        ? undefined
        : [
            `Copy the ${DEVTOOLS_SKILL_NAME} skill into ${join(codexHome, 'skills', DEVTOOLS_SKILL_NAME)}`,
            `Expected file: ${skillPath}`
          ]
    },
    enablement: [
      'Enable DevTools for a run with CODEX_REVIEW_DEVTOOLS=1',
      "Or run Codex with: codex -c 'mcp_servers.chrome-devtools.enabled=true' ..."
    ]
  };

  const missing = dependencies.filter((dep) => dep.status === 'missing').map((dep) => dep.name);
  if (!skillInstalled) {
    missing.push(DEVTOOLS_SKILL_NAME);
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
  for (const line of result.devtools.enablement) {
    lines.push(`  - ${line}`);
  }

  return lines;
}

function resolveCodexHome(): string {
  const override = process.env.CODEX_HOME?.trim();
  if (override) {
    return override;
  }
  return join(homedir(), '.codex');
}
