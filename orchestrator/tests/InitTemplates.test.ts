import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { formatInitSummary, initCodexTemplates } from '../src/cli/init.js';

let tempDir: string | null = null;

afterEach(async () => {
  if (tempDir) {
    await rm(tempDir, { recursive: true, force: true });
    tempDir = null;
  }
});

describe('initCodexTemplates', () => {
  it('copies templates and skips existing files without --force', async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), 'codex-init-'));

    const first = await initCodexTemplates({ template: 'codex', cwd: tempDir, force: false });
    expect(first.written.some((filePath) => filePath.endsWith('mcp-client.json'))).toBe(true);

    const templatePath = path.join(tempDir, 'mcp-client.json');
    const contents = await readFile(templatePath, 'utf8');
    expect(contents).toContain('"templateVersion"');

    const second = await initCodexTemplates({ template: 'codex', cwd: tempDir, force: false });
    expect(second.written).toHaveLength(0);
    expect(second.skipped.some((filePath) => filePath.endsWith('mcp-client.json'))).toBe(true);

    const summary = formatInitSummary(first, tempDir).join('\n');
    expect(summary).toContain('Written:');
    expect(summary).toContain('mcp-client.json');
  });
});
