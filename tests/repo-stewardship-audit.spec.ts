import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  renderRepoStewardshipMarkdown,
  runRepoStewardshipAudit
} from '../scripts/repo-stewardship-audit.mjs';

const createdDirs: string[] = [];

afterEach(async () => {
  while (createdDirs.length > 0) {
    const dir = createdDirs.pop();
    if (dir) {
      await rm(dir, { recursive: true, force: true });
    }
  }
});

async function initTrackedRepo(repoRoot: string) {
  execFileSync('git', ['init'], { cwd: repoRoot, stdio: 'ignore' });
  execFileSync('git', ['add', '.'], { cwd: repoRoot, stdio: 'ignore' });
}

async function writeCatalog(repoRoot: string, catalog: Record<string, unknown>) {
  await mkdir(join(repoRoot, 'docs'), { recursive: true });
  await writeFile(
    join(repoRoot, 'docs', 'repo-stewardship-catalog.json'),
    JSON.stringify(catalog, null, 2),
    'utf8'
  );
}

describe('repo stewardship audit', () => {
  it(
    'emits explicit decisions for validate, update, and retain_with_rationale surfaces',
    async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'repo-stewardship-audit-'));
    createdDirs.push(repoRoot);

    await mkdir(join(repoRoot, '.github', 'workflows'), { recursive: true });
    await mkdir(join(repoRoot, 'reference', 'plus-ex-15th', 'scripts'), { recursive: true });
    await writeFile(join(repoRoot, 'README.md'), '# Front door\n', 'utf8');
    await writeFile(
      join(repoRoot, 'package.json'),
      JSON.stringify(
        {
          name: 'fixture',
          scripts: {
            'docs:check': 'echo ok',
            'docs:freshness': 'echo ok'
          }
        },
        null,
        2
      ),
      'utf8'
    );
    await writeFile(
      join(repoRoot, '.github', 'workflows', 'docs-truthfulness-weekly.yml'),
      'name: Docs Truthfulness Weekly\nsteps:\n  - run: npm run docs:freshness\n',
      'utf8'
    );
    await writeFile(join(repoRoot, 'reference', 'plus-ex-15th', 'README.md'), '# Retained\n', 'utf8');
    await writeFile(
      join(repoRoot, 'reference', 'plus-ex-15th', 'scripts', 'loader-scroll-macro.js'),
      'export const loader = true;\n',
      'utf8'
    );
    await writeFile(join(repoRoot, 'reference', 'mirror.config.wp.example.json'), '{}\n', 'utf8');
    await writeCatalog(repoRoot, {
      version: 1,
      classes: {
        front_door: { label: 'Front Door', report_order: 10 },
        workflow: { label: 'Workflow', report_order: 20 },
        repo_config: { label: 'Repo Config', report_order: 30 },
        reference_history: { label: 'Reference History', report_order: 40 },
        uncatalogued: { label: 'Uncatalogued', report_order: 999 }
      },
      entries: [
        {
          path: 'README.md',
          surface_class: 'front_door',
          decision: 'validate',
          owner: 'Codex',
          rationale: 'front door remains active'
        },
        {
          path: 'package.json',
          surface_class: 'repo_config',
          decision: 'validate',
          owner: 'Codex',
          rationale: 'package manifest must expose required scripts',
          checks: {
            required_scripts: ['docs:check', 'docs:freshness', 'repo:stewardship']
          }
        },
        {
          path: '.github/workflows/docs-truthfulness-weekly.yml',
          surface_class: 'workflow',
          decision: 'validate',
          owner: 'Codex',
          rationale: 'weekly upkeep workflow must run the repo stewardship audit',
          checks: {
            required_text: ['npm run repo:stewardship']
          }
        }
      ],
      patterns: [
        {
          glob: 'reference/**',
          surface_class: 'reference_history',
          decision: 'retain_with_rationale',
          owner: 'Codex',
          rationale: 'historical references require a local README anchor',
          checks: {
            requires_local_readme: true,
            readme_boundary: 'reference'
          }
        },
        {
          glob: 'docs/**/*.json',
          surface_class: 'repo_config',
          decision: 'validate',
          owner: 'Codex',
          rationale: 'catalog files stay explicit config surfaces'
        }
      ]
    });

    await initTrackedRepo(repoRoot);

    const { report, hasFailures } = await runRepoStewardshipAudit(repoRoot, {
      outRoot: join(repoRoot, 'out'),
      taskId: 'fixture'
    });

    expect(hasFailures).toBe(false);
    expect(report.uncatalogued_surfaces).toEqual([]);

    const readmeDecision = report.decisions.find((item) => item.path === 'README.md');
    const packageDecision = report.decisions.find((item) => item.path === 'package.json');
    const workflowDecision = report.decisions.find(
      (item) => item.path === '.github/workflows/docs-truthfulness-weekly.yml'
    );
    const retainedDecision = report.decisions.find(
      (item) => item.path === 'reference/plus-ex-15th/scripts/loader-scroll-macro.js'
    );
    const missingAnchorDecision = report.decisions.find(
      (item) => item.path === 'reference/mirror.config.wp.example.json'
    );

    expect(readmeDecision?.decision).toBe('validate');
    expect(packageDecision?.decision).toBe('update');
    expect(packageDecision?.summary).toContain('repo:stewardship');
    expect(workflowDecision?.decision).toBe('update');
    expect(retainedDecision?.decision).toBe('retain_with_rationale');
    expect(retainedDecision?.readme_anchor).toBe('reference/plus-ex-15th/README.md');
    expect(missingAnchorDecision?.decision).toBe('update');

    const markdown = renderRepoStewardshipMarkdown(report);
    expect(markdown).toContain('## Action Required');
    expect(markdown).toContain('reference/plus-ex-15th/scripts/loader-scroll-macro.js');
    },
    20_000
  );

  it(
    'fails closed when tracked surfaces fall outside the stewardship catalog',
    async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'repo-stewardship-uncatalogued-'));
    createdDirs.push(repoRoot);

    await writeFile(join(repoRoot, 'README.md'), '# Front door\n', 'utf8');
    await writeFile(join(repoRoot, 'mystery.bin'), 'mystery\n', 'utf8');
    await writeCatalog(repoRoot, {
      version: 1,
      classes: {
        front_door: { label: 'Front Door', report_order: 10 },
        uncatalogued: { label: 'Uncatalogued', report_order: 999 }
      },
      entries: [
        {
          path: 'README.md',
          surface_class: 'front_door',
          decision: 'validate',
          owner: 'Codex',
          rationale: 'front door remains active'
        }
      ]
    });

    await initTrackedRepo(repoRoot);

    const { report, hasFailures } = await runRepoStewardshipAudit(repoRoot, {
      outRoot: join(repoRoot, 'out'),
      taskId: 'fixture'
    });

    expect(hasFailures).toBe(true);
    expect(report.uncatalogued_surfaces).toContain('mystery.bin');
    expect(report.decisions.find((item) => item.path === 'mystery.bin')?.decision).toBe('update');
    },
    20_000
  );

  it(
    'supports explicit delete decisions without treating them as uncatalogued drift',
    async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'repo-stewardship-delete-'));
    createdDirs.push(repoRoot);

    await mkdir(join(repoRoot, 'legacy'), { recursive: true });
    await writeFile(join(repoRoot, 'legacy', 'obsolete.log'), 'remove me\n', 'utf8');
    await writeCatalog(repoRoot, {
      version: 1,
      classes: {
        archive_history: { label: 'Archive History', report_order: 10 },
        repo_config: { label: 'Repo Config', report_order: 20 }
      },
      entries: [
        {
          path: 'legacy/obsolete.log',
          surface_class: 'archive_history',
          decision: 'delete',
          owner: 'Codex',
          rationale: 'fixture proves delete decisions remain machine-checkable'
        }
      ],
      patterns: [
        {
          glob: 'docs/**/*.json',
          surface_class: 'repo_config',
          decision: 'validate',
          owner: 'Codex',
          rationale: 'catalog files stay explicit config surfaces'
        }
      ]
    });

    await initTrackedRepo(repoRoot);

    const { report, hasFailures } = await runRepoStewardshipAudit(repoRoot, {
      outRoot: join(repoRoot, 'out'),
      taskId: 'fixture'
    });

    expect(hasFailures).toBe(false);
    expect(report.decisions.find((item) => item.path === 'legacy/obsolete.log')?.decision).toBe('delete');
    expect(report.totals.delete).toBe(1);
    },
    20_000
  );

  it(
    'marks deleted tracked surfaces as update instead of throwing',
    async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'repo-stewardship-missing-surface-'));
    createdDirs.push(repoRoot);

    await mkdir(join(repoRoot, '.github', 'workflows'), { recursive: true });
    await writeFile(
      join(repoRoot, 'package.json'),
      JSON.stringify(
        {
          name: 'fixture',
          scripts: {
            'docs:check': 'echo ok'
          }
        },
        null,
        2
      ),
      'utf8'
    );
    await writeFile(
      join(repoRoot, '.github', 'workflows', 'docs-truthfulness-weekly.yml'),
      'steps:\n  - run: npm run docs:check\n',
      'utf8'
    );
    await writeCatalog(repoRoot, {
      version: 1,
      classes: {
        repo_config: { label: 'Repo Config', report_order: 10 },
        workflow: { label: 'Workflow', report_order: 20 }
      },
      entries: [
        {
          path: 'package.json',
          surface_class: 'repo_config',
          decision: 'validate',
          owner: 'Codex',
          rationale: 'package manifest must stay present',
          checks: {
            required_scripts: ['docs:check']
          }
        },
        {
          path: '.github/workflows/docs-truthfulness-weekly.yml',
          surface_class: 'workflow',
          decision: 'validate',
          owner: 'Codex',
          rationale: 'weekly workflow must stay present',
          checks: {
            required_text: ['npm run docs:check']
          }
        }
      ],
      patterns: [
        {
          glob: 'docs/**/*.json',
          surface_class: 'repo_config',
          decision: 'validate',
          owner: 'Codex',
          rationale: 'catalog files stay explicit config surfaces'
        }
      ]
    });

    await initTrackedRepo(repoRoot);
    await rm(join(repoRoot, 'package.json'));
    await rm(join(repoRoot, '.github', 'workflows', 'docs-truthfulness-weekly.yml'));

    const { report, hasFailures } = await runRepoStewardshipAudit(repoRoot, {
      outRoot: join(repoRoot, 'out'),
      taskId: 'fixture'
    });

    expect(hasFailures).toBe(false);
    expect(report.decisions.find((item) => item.path === 'package.json')?.decision).toBe('update');
    expect(
      report.decisions.find((item) => item.path === 'package.json')?.summary
    ).toContain('tracked surface missing from working tree');
    expect(
      report.decisions.find((item) => item.path === '.github/workflows/docs-truthfulness-weekly.yml')
        ?.decision
    ).toBe('update');
    expect(
      report.decisions.find((item) => item.path === '.github/workflows/docs-truthfulness-weekly.yml')
        ?.summary
    ).toContain('tracked surface missing from working tree');
    },
    20_000
  );

  it(
    'preserves leading and trailing whitespace in tracked surface paths',
    async () => {
      const repoRoot = await mkdtemp(join(tmpdir(), 'repo-stewardship-spaced-paths-'));
      createdDirs.push(repoRoot);

      await writeFile(join(repoRoot, ' leading.txt'), 'leading space\n', 'utf8');
      await writeFile(join(repoRoot, 'trailing.txt '), 'trailing space\n', 'utf8');
      await writeCatalog(repoRoot, {
        version: 1,
        classes: {
          code_surface: { label: 'Code Surface', report_order: 10 },
          repo_config: { label: 'Repo Config', report_order: 20 }
        },
        entries: [
          {
            path: ' leading.txt',
            surface_class: 'code_surface',
            decision: 'validate',
            owner: 'Codex',
            rationale: 'fixture proves leading path whitespace stays exact'
          },
          {
            path: 'trailing.txt ',
            surface_class: 'code_surface',
            decision: 'validate',
            owner: 'Codex',
            rationale: 'fixture proves trailing path whitespace stays exact'
          }
        ],
        patterns: [
          {
            glob: 'docs/**/*.json',
            surface_class: 'repo_config',
            decision: 'validate',
            owner: 'Codex',
            rationale: 'catalog files stay explicit config surfaces'
          }
        ]
      });

      await initTrackedRepo(repoRoot);

      const { report, hasFailures } = await runRepoStewardshipAudit(repoRoot, {
        outRoot: join(repoRoot, 'out'),
        taskId: 'fixture'
      });

      expect(hasFailures).toBe(false);
      expect(report.uncatalogued_surfaces).toEqual([]);
      expect(report.decisions.find((item) => item.path === ' leading.txt')?.decision).toBe(
        'validate'
      );
      expect(report.decisions.find((item) => item.path === 'trailing.txt ')?.decision).toBe(
        'validate'
      );
      expect(report.decisions.find((item) => item.path === ' leading.txt')?.summary).not.toContain(
        'tracked surface missing'
      );
      expect(report.decisions.find((item) => item.path === 'trailing.txt ')?.summary).not.toContain(
        'tracked surface missing'
      );
    },
    20_000
  );
});
