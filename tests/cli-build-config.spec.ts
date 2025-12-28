import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function readFirstLine(filePath: string): string {
  const raw = readFileSync(filePath, 'utf8');
  return raw.split(/\r?\n/)[0] ?? '';
}

describe('CLI build configuration', () => {
  it('preserves the CLI shebang in source or dist output', () => {
    const distPath = join(process.cwd(), 'dist', 'bin', 'codex-orchestrator.js');
    const sourcePath = join(process.cwd(), 'bin', 'codex-orchestrator.ts');
    const targetPath = existsSync(distPath) ? distPath : sourcePath;

    expect(readFirstLine(targetPath)).toBe('#!/usr/bin/env node');
  });

  it('uses NodeNext ESM settings', () => {
    const configPath = join(process.cwd(), 'tsconfig.json');
    const raw = readFileSync(configPath, 'utf8');
    const config = JSON.parse(raw) as {
      compilerOptions?: { module?: string; moduleResolution?: string };
    };
    expect(config.compilerOptions?.module).toBe('NodeNext');
    expect(config.compilerOptions?.moduleResolution).toBe('NodeNext');
  });

  it('declares ESM mode in package.json', () => {
    const pkgPath = join(process.cwd(), 'package.json');
    const raw = readFileSync(pkgPath, 'utf8');
    const pkg = JSON.parse(raw) as { type?: string };
    expect(pkg.type).toBe('module');
  });
});
