import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { installSkills } from '../src/cli/skills.js';

describe('installSkills', () => {
  it('installs delegation canonical + alias skills into codex home', async () => {
    const tempHome = await mkdtemp(join(tmpdir(), 'skills-install-'));
    try {
      const result = await installSkills({ codexHome: tempHome, force: true });
      const canonicalPath = join(tempHome, 'skills', 'delegation-usage', 'SKILL.md');
      const aliasPath = join(tempHome, 'skills', 'delegate-early', 'SKILL.md');
      const canonical = await readFile(canonicalPath, 'utf8');
      const alias = await readFile(aliasPath, 'utf8');

      expect(result.skills).toContain('delegation-usage');
      expect(result.skills).toContain('delegate-early');
      expect(canonical).toContain('Delegation Usage');
      expect(canonical).toContain('canonical delegation workflow');
      expect(canonical).toContain('@latest');
      expect(alias).toContain('Compatibility Alias');
      expect(alias).toContain('delegation-usage');
      expect(result.written.some((path) => path.endsWith('skills/delegation-usage/SKILL.md'))).toBe(true);
      expect(result.written.some((path) => path.endsWith('skills/delegate-early/SKILL.md'))).toBe(true);
    } finally {
      await rm(tempHome, { recursive: true, force: true });
    }
  });

  it('skips existing files when force is disabled', async () => {
    const tempHome = await mkdtemp(join(tmpdir(), 'skills-install-skip-'));
    try {
      await installSkills({ codexHome: tempHome, force: true });
      const second = await installSkills({ codexHome: tempHome, force: false });

      expect(second.written.length).toBe(0);
      expect(second.skipped.length).toBeGreaterThan(0);
      expect(second.skipped.some((path) => path.endsWith('skills/delegation-usage/SKILL.md'))).toBe(true);
      expect(second.skipped.some((path) => path.endsWith('skills/delegate-early/SKILL.md'))).toBe(true);
    } finally {
      await rm(tempHome, { recursive: true, force: true });
    }
  });
});
