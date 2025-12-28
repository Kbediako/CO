import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { buildSelfCheckResult } from '../src/cli/selfCheck.js';
import { findPackageRoot, loadPackageInfo } from '../src/cli/utils/packageInfo.js';

function readPackageJson() {
  const root = findPackageRoot();
  const raw = readFileSync(join(root, 'package.json'), 'utf8');
  return JSON.parse(raw) as { name?: string; version?: string; type?: string };
}

describe('loadPackageInfo', () => {
  it('returns name and version from package.json', () => {
    const pkg = readPackageJson();
    const info = loadPackageInfo();
    expect(info.name).toBe(pkg.name);
    expect(info.version).toBe(pkg.version);
  });
});

describe('buildSelfCheckResult', () => {
  it('includes basic runtime metadata', () => {
    const pkg = readPackageJson();
    const result = buildSelfCheckResult();
    expect(result.status).toBe('ok');
    expect(result.name).toBe(pkg.name);
    expect(result.version).toBe(pkg.version);
    expect(result.node).toBe(process.version);
    expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
  });
});
