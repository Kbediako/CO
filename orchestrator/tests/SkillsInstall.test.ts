import { existsSync } from 'node:fs';
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
      const canonicalSuffix = join('skills', 'delegation-usage', 'SKILL.md');
      const aliasSuffix = join('skills', 'delegate-early', 'SKILL.md');
      expect(result.written.some((path) => path.endsWith(canonicalSuffix))).toBe(true);
      expect(result.written.some((path) => path.endsWith(aliasSuffix))).toBe(true);
    } finally {
      await rm(tempHome, { recursive: true, force: true });
    }
  });

  it('installs collab-subagents-first with explicit close_agent hygiene', async () => {
    const tempHome = await mkdtemp(join(tmpdir(), 'skills-install-collab-'));
    try {
      const result = await installSkills({ codexHome: tempHome, force: true });
      const skillPath = join(tempHome, 'skills', 'collab-subagents-first', 'SKILL.md');
      const briefPath = join(tempHome, 'skills', 'collab-subagents-first', 'references', 'subagent-brief-template.md');
      const skill = await readFile(skillPath, 'utf8');
      const brief = await readFile(briefPath, 'utf8');

      expect(result.skills).toContain('collab-subagents-first');
      expect(skill).toContain('Collab Subagents First');
      expect(skill).toContain('Collab lifecycle hygiene');
      expect(skill).toContain('close_agent');
      expect(skill).toContain('agent thread limit reached');
      expect(brief).toContain('Subagent Brief Template');
    } finally {
      await rm(tempHome, { recursive: true, force: true });
    }
  });

  it('installs only selected skills when only is provided', async () => {
    const tempHome = await mkdtemp(join(tmpdir(), 'skills-install-only-'));
    try {
      const result = await installSkills({ codexHome: tempHome, force: true, only: ['collab-subagents-first'] });
      const installedPath = join(tempHome, 'skills', 'collab-subagents-first', 'SKILL.md');
      const skippedPath = join(tempHome, 'skills', 'delegation-usage', 'SKILL.md');

      expect(result.skills).toEqual(['collab-subagents-first']);
      expect(existsSync(installedPath)).toBe(true);
      expect(existsSync(skippedPath)).toBe(false);
    } finally {
      await rm(tempHome, { recursive: true, force: true });
    }
  });

  it('skips existing files when force is disabled', async () => {
    const tempHome = await mkdtemp(join(tmpdir(), 'skills-install-skip-'));
    try {
      await installSkills({ codexHome: tempHome, force: true });
      const second = await installSkills({ codexHome: tempHome, force: false });

      const canonicalSuffix = join('skills', 'delegation-usage', 'SKILL.md');
      const aliasSuffix = join('skills', 'delegate-early', 'SKILL.md');
      expect(second.written.length).toBe(0);
      expect(second.skipped.length).toBeGreaterThan(0);
      expect(second.skipped.some((path) => path.endsWith(canonicalSuffix))).toBe(true);
      expect(second.skipped.some((path) => path.endsWith(aliasSuffix))).toBe(true);
    } finally {
      await rm(tempHome, { recursive: true, force: true });
    }
  });
});
