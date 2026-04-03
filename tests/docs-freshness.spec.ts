import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { renderDocsFreshnessMarkdown, runDocsFreshness } from '../scripts/docs-freshness.mjs';

const createdDirs: string[] = [];

afterEach(async () => {
  while (createdDirs.length > 0) {
    const dir = createdDirs.pop();
    if (dir) {
      await rm(dir, { recursive: true, force: true });
    }
  }
});

async function writeDocsFreshnessFixture(
  repoRoot: string,
  {
    registryEntries,
    catalogEntries = [],
    catalogPatterns = []
  }: {
    registryEntries: Array<Record<string, unknown>>;
    catalogEntries?: Array<Record<string, unknown>>;
    catalogPatterns?: Array<Record<string, unknown>>;
  }
) {
  await mkdir(join(repoRoot, 'docs'), { recursive: true });
  await writeFile(
    join(repoRoot, 'docs', 'docs-freshness-registry.json'),
    JSON.stringify(
      {
        version: 1,
        entries: registryEntries
      },
      null,
      2
    ),
    'utf8'
  );
  await writeFile(
    join(repoRoot, 'docs', 'docs-catalog.json'),
    JSON.stringify(
      {
        version: 1,
        classes: {
          front_door: { label: 'Front Door', report_order: 10 },
          repo_guide: { label: 'Repository Guide', report_order: 20 },
          task_packet: { label: 'Task Packet', report_order: 200 },
          uncatalogued: { label: 'Uncatalogued', report_order: 999 }
        },
        entries: catalogEntries,
        patterns: catalogPatterns
      },
      null,
      2
    ),
    'utf8'
  );
}

describe('docs freshness reporting', () => {
  it('fails closed when the docs catalog is missing', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-freshness-missing-catalog-'));
    createdDirs.push(repoRoot);

    await mkdir(join(repoRoot, 'docs'), { recursive: true });
    await writeFile(join(repoRoot, 'README.md'), '# Front door\n', 'utf8');
    await writeFile(
      join(repoRoot, 'docs', 'docs-freshness-registry.json'),
      JSON.stringify(
        {
          version: 1,
          entries: [
            {
              path: 'README.md',
              owner: 'Codex',
              status: 'active',
              last_review: '2026-04-03',
              cadence_days: 30
            }
          ]
        },
        null,
        2
      ),
      'utf8'
    );

    await expect(
      runDocsFreshness(repoRoot, {
        outRoot: join(repoRoot, 'out'),
        taskId: 'fixture'
      })
    ).rejects.toThrow('docs/docs-catalog.json');
  });

  it('emits class-separated report totals when a docs catalog is present', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-freshness-catalog-'));
    createdDirs.push(repoRoot);

    await mkdir(join(repoRoot, 'docs'), { recursive: true });
    await mkdir(join(repoRoot, 'tasks'), { recursive: true });
    await writeFile(join(repoRoot, 'README.md'), '# Front door\n', 'utf8');
    await writeFile(join(repoRoot, 'docs', 'README.md'), '# Repo guide\n', 'utf8');
    await writeFile(join(repoRoot, 'tasks', 'tasks-0906-docs.md'), '# Task\n', 'utf8');
    await writeDocsFreshnessFixture(repoRoot, {
      registryEntries: [
        {
          path: 'README.md',
          owner: 'Codex',
          status: 'active',
          last_review: '2026-04-03',
          cadence_days: 30
        },
        {
          path: 'docs/README.md',
          owner: 'Codex',
          status: 'active',
          last_review: '2026-04-03',
          cadence_days: 30
        },
        {
          path: 'tasks/tasks-0906-docs.md',
          owner: 'Codex',
          status: 'active',
          last_review: '2026-04-03',
          cadence_days: 30
        }
      ],
      catalogEntries: [
        {
          path: 'README.md',
          doc_class: 'front_door'
        }
      ],
      catalogPatterns: [
        {
          glob: 'docs/*.md',
          doc_class: 'repo_guide'
        },
        {
          glob: 'tasks/**/*.md',
          doc_class: 'task_packet'
        }
      ]
    });

    const { report, hasFailures } = await runDocsFreshness(repoRoot, {
      outRoot: join(repoRoot, 'out'),
      taskId: 'fixture'
    });

    expect(hasFailures).toBe(false);
    expect(report.totals.uncatalogued_docs).toBe(0);
    expect(report.class_summary).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ doc_class: 'front_door', docs_scanned: 1, registry_entries: 1 }),
        expect.objectContaining({ doc_class: 'repo_guide', docs_scanned: 1, registry_entries: 1 }),
        expect.objectContaining({ doc_class: 'task_packet', docs_scanned: 1, registry_entries: 1 })
      ])
    );
  });

  it('treats uncatalogued docs as failures so active surfaces cannot hide outside the catalog', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-freshness-uncatalogued-'));
    createdDirs.push(repoRoot);

    await mkdir(join(repoRoot, 'docs'), { recursive: true });
    await writeFile(join(repoRoot, 'README.md'), '# Front door\n', 'utf8');
    await writeFile(join(repoRoot, 'docs', 'README.md'), '# Repo guide\n', 'utf8');
    await writeDocsFreshnessFixture(repoRoot, {
      registryEntries: [
        {
          path: 'README.md',
          owner: 'Codex',
          status: 'active',
          last_review: '2026-04-03',
          cadence_days: 30
        },
        {
          path: 'docs/README.md',
          owner: 'Codex',
          status: 'active',
          last_review: '2026-04-03',
          cadence_days: 30
        }
      ],
      catalogEntries: [
        {
          path: 'README.md',
          doc_class: 'front_door'
        }
      ]
    });

    const { report, hasFailures } = await runDocsFreshness(repoRoot, {
      outRoot: join(repoRoot, 'out'),
      taskId: 'fixture'
    });

    expect(hasFailures).toBe(true);
    expect(report.uncatalogued_docs).toContain('docs/README.md');
    expect(report.class_summary).toEqual(
      expect.arrayContaining([expect.objectContaining({ doc_class: 'uncatalogued', docs_scanned: 1 })])
    );
  });

  it('writes a class-separated markdown summary when requested', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-freshness-summary-'));
    createdDirs.push(repoRoot);

    await mkdir(join(repoRoot, 'docs'), { recursive: true });
    await writeFile(join(repoRoot, 'README.md'), '# Front door\n', 'utf8');
    await writeFile(join(repoRoot, 'docs', 'README.md'), '# Repo guide\n', 'utf8');
    await writeDocsFreshnessFixture(repoRoot, {
      registryEntries: [
        {
          path: 'README.md',
          owner: 'Codex',
          status: 'active',
          last_review: '2026-04-03',
          cadence_days: 30
        }
      ],
      catalogEntries: [
        {
          path: 'README.md',
          doc_class: 'front_door'
        }
      ]
    });

    const { report, summaryMarkdownPath } = await runDocsFreshness(repoRoot, {
      outRoot: join(repoRoot, 'out'),
      taskId: 'fixture',
      summaryMarkdownPath: 'out/fixture/docs-freshness-summary.md'
    });

    expect(summaryMarkdownPath).toBe(join(repoRoot, 'out', 'fixture', 'docs-freshness-summary.md'));

    const markdown = await readFile(summaryMarkdownPath, 'utf8');
    expect(markdown).toContain('# Docs Truthfulness Drift Report');
    expect(markdown).toContain('## Class Summary');
    expect(markdown).toContain('| Front Door | 1 | 1 | 0 | 0 | 0 | 0 | 0 |');
    expect(markdown).toContain('### Uncatalogued');
    expect(markdown).toContain('`docs/README.md`');

    const rendered = renderDocsFreshnessMarkdown(report);
    expect(rendered).toContain('## Drift By Class');
  });
});
