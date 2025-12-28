import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { importOptionalDependency, resolveOptionalDependency } from '../src/cli/utils/optionalDeps.js';

let tempDir: string | null = null;

afterEach(async () => {
  if (tempDir) {
    await rm(tempDir, { recursive: true, force: true });
    tempDir = null;
  }
});

async function setupTempPackage(): Promise<string> {
  tempDir = await mkdtemp(path.join(os.tmpdir(), 'codex-optional-'));
  await writeFile(path.join(tempDir, 'package.json'), JSON.stringify({ name: 'optional-test' }, null, 2));
  return tempDir;
}

async function addDummyModule(root: string, name: string): Promise<string> {
  const moduleRoot = path.join(root, 'node_modules', name);
  await mkdir(moduleRoot, { recursive: true });
  await writeFile(path.join(moduleRoot, 'package.json'), JSON.stringify({ name }, null, 2));
  await writeFile(path.join(moduleRoot, 'index.js'), 'module.exports = { value: 42 };');
  return moduleRoot;
}

describe('resolveOptionalDependency', () => {
  it('prefers modules resolved from the cwd package', async () => {
    const root = await setupTempPackage();
    await addDummyModule(root, 'optional-dep');

    const resolved = resolveOptionalDependency('optional-dep', root);
    expect(resolved.source).toBe('cwd');
    expect(resolved.path).toContain('optional-dep');
  });

  it('falls back to package resolution when cwd is missing', async () => {
    const root = await setupTempPackage();
    const resolved = resolveOptionalDependency('ajv', root);
    expect(resolved.source).toBe('package');
    expect(resolved.path).toContain('ajv');
  });
});

describe('importOptionalDependency', () => {
  it('throws a clear error when missing', async () => {
    const root = await setupTempPackage();
    await expect(importOptionalDependency('missing-dep', root)).rejects.toThrow(/Missing optional dependency/);
  });
});
