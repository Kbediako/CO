import { describe, expect, it } from 'vitest';
import { mkdtemp, writeFile, chmod, rename } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { createCodexCliCrystalizerClient } from '../src/learning/crystalizer.js';

describe('LearningCrystalizer Codex CLI client', () => {
  it('waits for CLI to finish writing output file', async () => {
    const workDir = await mkdtemp(join(tmpdir(), 'codex-cli-crystalizer-'));
    const scriptPath = join(workDir, 'fake-codex');
    const scriptTmpPath = join(workDir, 'fake-codex.tmp');
    const outputContent = 'cli-generated-pattern';
    const script = `#!/usr/bin/env bash
set -euo pipefail
while [[ "$#" -gt 0 ]]; do
  case "$1" in
    --output-file)
      shift
      target="$1"
      shift
      ;;
    *)
      shift
      ;;
  esac
done
sleep 0.2
echo "${outputContent}" > "$target"
`;
    await writeFile(scriptTmpPath, script, { mode: 0o755 });
    await chmod(scriptTmpPath, 0o755);
    await rename(scriptTmpPath, scriptPath);

    const client = await createCodexCliCrystalizerClient(scriptPath);
    const result = await client.generate('prompt-body', { model: 'gpt-5.1-codex-max' });
    expect(result.content).toBe(outputContent);
  });
});
