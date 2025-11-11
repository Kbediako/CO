import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';

import { loadInstructionSet } from '../../src/instructions/loader.js';

async function writeStampedInstructions(path: string, content: string): Promise<void> {
  const stamp = createHash('sha256').update(content, 'utf8').digest('hex');
  const payload = `<!-- codex:instruction-stamp ${stamp} -->\n${content}`;
  await writeFile(path, payload, 'utf8');
}

describe('InstructionStampGuard', () => {
  let workspace: string;
  const originalLimit = process.env.TFGRPO_EXPERIENCE_MAX_WORDS;

  beforeEach(async () => {
    workspace = await mkdtemp(join(tmpdir(), 'instruction-guard-'));
  });

  afterEach(async () => {
    if (originalLimit === undefined) {
      delete process.env.TFGRPO_EXPERIENCE_MAX_WORDS;
    } else {
      process.env.TFGRPO_EXPERIENCE_MAX_WORDS = originalLimit;
    }
    await rm(workspace, { recursive: true, force: true });
  });

  it('rejects instruction files missing stamp headers', async () => {
    await writeFile(join(workspace, 'AGENTS.md'), '# Missing Stamp\nContent', 'utf8');
    await expect(loadInstructionSet(workspace)).rejects.toThrow(/stamp/i);
  });

  it('rejects instruction files with mismatched stamps', async () => {
    const fakeStamp = 'a'.repeat(64);
    const payload = `<!-- codex:instruction-stamp ${fakeStamp} -->\n# Bad Stamp\nContent`;
    await writeFile(join(workspace, 'AGENTS.md'), payload, 'utf8');
    await expect(loadInstructionSet(workspace)).rejects.toThrow(/stamp/i);
  });

  it('enforces TFGRPO_EXPERIENCE_MAX_WORDS guardrail', async () => {
    await writeStampedInstructions(join(workspace, 'AGENTS.md'), '# Guarded\nContent');
    process.env.TFGRPO_EXPERIENCE_MAX_WORDS = '64';
    await expect(loadInstructionSet(workspace)).rejects.toThrow(/guardrail/i);
  });
});
