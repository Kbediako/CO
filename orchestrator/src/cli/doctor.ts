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

export interface DoctorDependencyStatus {
  name: string;
  status: 'ok' | 'missing';
  source: OptionalResolutionSource;
  install?: string;
}

export interface DoctorResult {
  status: 'ok' | 'warning';
  missing: string[];
  dependencies: DoctorDependencyStatus[];
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

  const missing = dependencies.filter((dep) => dep.status === 'missing').map((dep) => dep.name);
  return {
    status: missing.length === 0 ? 'ok' : 'warning',
    missing,
    dependencies
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

  return lines;
}
