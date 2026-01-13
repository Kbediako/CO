import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { installSkills } from '../src/cli/skills.js';

describe('installSkills', () => {
  it('installs bundled skills into the codex home directory', async () => {
    const tempHome = await mkdtemp(join(tmpdir(), 'skills-install-'));
    try {
      const result = await installSkills({ codexHome: tempHome, force: true });
      const installedSkill = join(tempHome, 'skills', 'delegation-usage', 'SKILL.md');
      const content = await readFile(installedSkill, 'utf8');

      expect(result.skills).toContain('delegation-usage');
      expect(content).toContain('Delegation Usage');
      expect(result.written.some((path) => path.endsWith('skills/delegation-usage/SKILL.md'))).toBe(true);
    } finally {
      await rm(tempHome, { recursive: true, force: true });
    }
  });
});
