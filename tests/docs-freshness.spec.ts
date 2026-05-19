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
    catalogPatterns = [],
    catalogPolicies = {}
  }: {
    registryEntries: Array<Record<string, unknown>>;
    catalogEntries?: Array<Record<string, unknown>>;
    catalogPatterns?: Array<Record<string, unknown>>;
    catalogPolicies?: Record<string, unknown>;
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
          task_mirror: { label: 'Task Mirror', report_order: 210 },
          report_only: { label: 'Report Only', report_order: 220 },
          uncatalogued: { label: 'Uncatalogued', report_order: 999 }
        },
        policies: catalogPolicies,
        entries: catalogEntries,
        patterns: catalogPatterns
      },
      null,
      2
    ),
    'utf8'
  );
}

function reviewDateDaysAgo(daysOld: number) {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() - daysOld);
  return date.toISOString().slice(0, 10);
}

function rollingFreshnessPolicy(overrides: Record<string, unknown> = {}) {
  return {
    enabled: true,
    owner_issue: 'CO-175',
    policy_doc: 'docs/guides/docs-freshness-cohorts.md',
    window_days: 7,
    max_cohorts: 1,
    max_entries: 10,
    eligible_doc_classes: ['task_packet'],
    baseline_cohorts: [
      {
        id: 'fixture-rolling-baseline',
        last_review: reviewDateDaysAgo(31),
        cadence_days: 30,
        path_families: ['tasks/tasks-*'],
        task_number_range: { start: '1234', end: '1235' }
      }
    ],
    ...overrides
  };
}

async function writeRollingDocsFixture(
  repoRoot: string,
  {
    entries = [{ path: 'tasks/tasks-1234-example.md', daysOld: 31 }],
    policy = rollingFreshnessPolicy()
  }: {
    entries?: Array<{ path: string; daysOld?: number }>;
    policy?: Record<string, unknown>;
  } = {}
) {
  for (const entry of entries) {
    const parent = entry.path.split('/').slice(0, -1).join('/');
    if (parent) {
      await mkdir(join(repoRoot, parent), { recursive: true });
    }
    await writeFile(join(repoRoot, entry.path), '# Fixture doc\n', 'utf8');
  }

  await writeDocsFreshnessFixture(repoRoot, {
    registryEntries: entries.map((entry) => ({
      path: entry.path,
      owner: 'Codex',
      status: 'active',
      last_review: reviewDateDaysAgo(entry.daysOld ?? 31),
      cadence_days: 30
    })),
    catalogPatterns: [
      { glob: 'tasks/**/*.md', doc_class: 'task_packet' },
      { glob: 'docs/*.md', doc_class: 'repo_guide' }
    ],
    catalogPolicies: {
      rolling_freshness_cohorts: policy
    }
  });
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
          last_review: reviewDateDaysAgo(1),
          cadence_days: 30
        },
        {
          path: 'docs/README.md',
          owner: 'Codex',
          status: 'active',
          last_review: reviewDateDaysAgo(1),
          cadence_days: 30
        },
        {
          path: 'tasks/tasks-0906-docs.md',
          owner: 'Codex',
          status: 'active',
          last_review: reviewDateDaysAgo(1),
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

  it('normalizes registry paths before classifying and comparing them', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-freshness-normalized-paths-'));
    createdDirs.push(repoRoot);

    await mkdir(join(repoRoot, 'docs'), { recursive: true });
    await writeFile(join(repoRoot, 'README.md'), '# Front door\n', 'utf8');
    await writeFile(join(repoRoot, 'docs', 'README.md'), '# Repo guide\n', 'utf8');
    await writeDocsFreshnessFixture(repoRoot, {
      registryEntries: [
        {
          path: './README.md',
          owner: 'Codex',
          status: 'active',
          last_review: reviewDateDaysAgo(1),
          cadence_days: 30
        },
        {
          path: 'docs\\README.md',
          owner: 'Codex',
          status: 'active',
          last_review: reviewDateDaysAgo(1),
          cadence_days: 30
        }
      ],
      catalogEntries: [
        {
          path: './README.md',
          doc_class: 'front_door'
        },
        {
          path: 'docs\\README.md',
          doc_class: 'repo_guide'
        }
      ]
    });

    const { report, hasFailures } = await runDocsFreshness(repoRoot, {
      outRoot: join(repoRoot, 'out'),
      taskId: 'fixture'
    });

    expect(hasFailures).toBe(false);
    expect(report.totals.missing_in_registry).toBe(0);
    expect(report.totals.uncatalogued_docs).toBe(0);
    expect(report.class_summary).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ doc_class: 'front_door', docs_scanned: 1, registry_entries: 1 }),
        expect.objectContaining({ doc_class: 'repo_guide', docs_scanned: 1, registry_entries: 1 })
      ])
    );
  });

  it('accepts preserved historical stubs without aging them into stale-doc debt', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-freshness-preserved-historical-stub-'));
    createdDirs.push(repoRoot);

    await mkdir(join(repoRoot, 'tasks'), { recursive: true });
    await writeFile(join(repoRoot, 'tasks', 'tasks-linear-example.md'), '# Historical stub\n', 'utf8');
    await writeDocsFreshnessFixture(repoRoot, {
      registryEntries: [
        {
          path: 'tasks/tasks-linear-example.md',
          status: 'preserved_historical_stub',
          last_review: '2025-01-01',
          cadence_days: 1
        }
      ],
      catalogPatterns: [
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
    expect(report.invalid_entries).toEqual([]);
    expect(report.totals.stale_entries).toBe(0);
    expect(report.totals.invalid_entries).toBe(0);
  });

  it('rejects preserved historical stub status on ordinary task packet content', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-freshness-preserved-historical-stub-invalid-'));
    createdDirs.push(repoRoot);

    await mkdir(join(repoRoot, 'tasks'), { recursive: true });
    await writeFile(
      join(repoRoot, 'tasks', 'tasks-linear-example.md'),
      '# Task Checklist\n\nOrdinary packet.\n\n## Notes\n\n# Historical stub\n',
      'utf8'
    );
    await writeDocsFreshnessFixture(repoRoot, {
      registryEntries: [
        {
          path: 'tasks/tasks-linear-example.md',
          status: 'preserved_historical_stub',
          last_review: '2025-01-01',
          cadence_days: 1
        }
      ],
      catalogPatterns: [
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

    expect(hasFailures).toBe(true);
    expect(report.invalid_entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: 'tasks/tasks-linear-example.md',
          issues: expect.arrayContaining(['preserved_historical_stub requires a historical task continuity stub'])
        })
      ])
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
          last_review: reviewDateDaysAgo(1),
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

  it('does not render ordinary class docs as uncatalogued when the class only fails on staleness', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-freshness-stale-summary-'));
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
          last_review: reviewDateDaysAgo(1),
          cadence_days: 30
        },
        {
          path: 'docs/README.md',
          owner: 'Codex',
          status: 'active',
          last_review: '2025-01-01',
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
        }
      ]
    });

    const { report } = await runDocsFreshness(repoRoot, {
      outRoot: join(repoRoot, 'out'),
      taskId: 'fixture'
    });

    const markdown = renderDocsFreshnessMarkdown(report);
    expect(markdown).toContain('### Repository Guide');
    expect(markdown).toContain('`docs/README.md (last_review=2025-01-01, cadence=30');
    expect(markdown).toContain('- Uncatalogued docs (0): none');
  });

  it('reports eligible stale docs as rolling cohort debt without failing the gate', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-freshness-rolling-cohort-'));
    createdDirs.push(repoRoot);

    await writeRollingDocsFixture(repoRoot, { policy: rollingFreshnessPolicy({ canonical_owner_issues: [{ canonical_owner_key: 'fixture-owner', owner_issue: 'CO-320', require_live_owner_verification: true }] }) });

    const { report, hasFailures } = await runDocsFreshness(repoRoot, {
      outRoot: join(repoRoot, 'out'),
      taskId: 'fixture'
    });

    expect(hasFailures).toBe(false);
    expect(report.totals.stale_entries).toBe(0);
    expect(report.totals.rolling_cohort_entries).toBe(1);
    expect(report.rolling_freshness_policy.canonical_owner_issues[0]).toEqual(expect.objectContaining({ canonical_owner_key: 'fixture-owner', owner_issue: 'CO-320', require_live_owner_verification: true }));
    expect(report.rolling_cohort_entries).toEqual([
      expect.objectContaining({
        path: 'tasks/tasks-1234-example.md',
        doc_class: 'task_packet',
        baseline_cohort_id: 'fixture-rolling-baseline',
        overdue_days: 1
      })
    ]);
    expect(report.rolling_freshness_cohorts).toEqual([
      expect.objectContaining({
        baseline_cohort_id: 'fixture-rolling-baseline',
        owner_issue: 'CO-175',
        stale_entries: 1,
        overdue_days: 1,
        lineage: expect.objectContaining({ task_number_range: '1234-1234' })
      })
    ]);

    const markdown = renderDocsFreshnessMarkdown(report);
    expect(markdown).toContain('## Rolling Freshness Cohorts');
    expect(markdown).toContain('- Owner issue: CO-175');
    expect(markdown).toContain('- Rolling cohort entries: 1');
    expect(markdown).toContain('No drift detected across the current docs catalog.');
  });

  it('keeps non-eligible stale docs as blocking failures when rolling cohorts are enabled', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-freshness-rolling-noneligible-'));
    createdDirs.push(repoRoot);

    await writeRollingDocsFixture(repoRoot, {
      entries: [{ path: 'docs/README.md', daysOld: 365 }],
      policy: rollingFreshnessPolicy({ window_days: 365, max_cohorts: 2 })
    });

    const { report, hasFailures } = await runDocsFreshness(repoRoot, {
      outRoot: join(repoRoot, 'out'),
      taskId: 'fixture'
    });

    expect(hasFailures).toBe(true);
    expect(report.totals.stale_entries).toBe(1);
    expect(report.totals.rolling_cohort_entries).toBe(0);
    expect(report.stale_entries).toEqual([
      expect.objectContaining({
        path: 'docs/README.md',
        doc_class: 'repo_guide'
      })
    ]);
  });

  it('forecasts strict public docs before expiry without rolling deferral', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-freshness-public-pre-expiry-'));
    createdDirs.push(repoRoot);

    await writeRollingDocsFixture(repoRoot, {
      entries: [{ path: 'docs/README.md', daysOld: 27 }],
      policy: rollingFreshnessPolicy({ window_days: 365, max_cohorts: 2 })
    });

    const { report, hasFailures } = await runDocsFreshness(repoRoot, {
      outRoot: join(repoRoot, 'out'),
      taskId: 'fixture'
    });

    expect(hasFailures).toBe(false);
    expect(report.totals.stale_entries).toBe(0);
    expect(report.totals.rolling_cohort_entries).toBe(0);
    expect(report.totals.pre_expiry_entries).toBe(1);
    expect(report.pre_expiry_entries).toEqual([
      expect.objectContaining({
        path: 'docs/README.md',
        doc_class: 'repo_guide',
        days_until_expiry: 3,
        direct_action_required: true,
        rolling_deferral_eligible: false
      })
    ]);
  });

  it('routes terminal task packet active rows to lifecycle action instead of ordinary stale debt', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-freshness-terminal-lifecycle-'));
    createdDirs.push(repoRoot);
    const taskKey = 'linear-terminal-fixture';
    const numericTaskKey = '1234-terminal-fixture';
    const packetPaths = [
      `.agent/task/${taskKey}.md`,
      `docs/PRD-${taskKey}.md`,
      `docs/TECH_SPEC-${taskKey}.md`,
      `docs/ACTION_PLAN-${taskKey}.md`,
      `tasks/specs/${taskKey}.md`,
      `tasks/tasks-${taskKey}.md`,
      'docs/findings/1234-terminal-fixture-deliberation.md'
    ];

    await Promise.all([
      mkdir(join(repoRoot, '.agent', 'task'), { recursive: true }),
      mkdir(join(repoRoot, 'docs'), { recursive: true }),
      mkdir(join(repoRoot, 'docs', 'findings'), { recursive: true }),
      mkdir(join(repoRoot, 'tasks', 'specs'), { recursive: true })
    ]);
    for (const packetPath of packetPaths) {
      await writeFile(join(repoRoot, packetPath), '# Terminal Packet\n', 'utf8');
    }
    await writeFile(
      join(repoRoot, 'tasks', 'index.json'),
      JSON.stringify(
        {
          items: [
            {
              id: '1234',
              slug: numericTaskKey,
              status: 'done',
              completed_at: `${reviewDateDaysAgo(1)}T06:59:43.056Z`,
              relates_to: `tasks/tasks-${taskKey}.md`,
              paths: {
                agent_task: `.agent/task/${taskKey}.md`,
                prd: `docs/PRD-${taskKey}.md`,
                docs: `docs/TECH_SPEC-${taskKey}.md`,
                action_plan: `docs/ACTION_PLAN-${taskKey}.md`,
                spec: `tasks/specs/${taskKey}.md`,
                task: `tasks/tasks-${taskKey}.md`
              },
              source_issue: {
                id: 'lin-terminal',
                identifier: 'CO-999'
              }
            }
          ]
        },
        null,
        2
      ),
      'utf8'
    );
    await writeDocsFreshnessFixture(repoRoot, {
      registryEntries: packetPaths.map((packetPath) => ({
        path: packetPath,
        owner: 'Codex',
        status: 'active',
        last_review: reviewDateDaysAgo(45),
        cadence_days: 30
      })),
      catalogPatterns: [
        { glob: '.agent/task/*.md', doc_class: 'task_mirror' },
        { glob: 'docs/findings/*.md', doc_class: 'report_only' },
        { glob: 'docs/*.md', doc_class: 'task_packet' },
        { glob: 'tasks/**/*.md', doc_class: 'task_packet' }
      ],
      catalogPolicies: {
        rolling_freshness_cohorts: rollingFreshnessPolicy({ max_entries: 300 })
      }
    });

    const { report, hasFailures } = await runDocsFreshness(repoRoot, {
      outRoot: join(repoRoot, 'out'),
      taskId: 'fixture'
    });

    expect(hasFailures).toBe(true);
    expect(report.totals.stale_entries).toBe(0);
    expect(report.totals.rolling_cohort_entries).toBe(0);
    expect(report.totals.terminal_lifecycle_entries).toBe(7);
    expect(report.terminal_lifecycle_entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: `tasks/tasks-${taskKey}.md`,
          lifecycle_state: 'terminal_pending_archive',
          recommended_action: 'archive_or_reclassify_terminal_packet',
          task_key: numericTaskKey,
          completed_at: reviewDateDaysAgo(1),
          source_issue: expect.objectContaining({ identifier: 'CO-999' })
        })
      ])
    );
    expect(report.terminal_lifecycle_entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: 'docs/findings/1234-terminal-fixture-deliberation.md',
          path_family: 'docs/findings',
          task_key: numericTaskKey
        })
      ])
    );
    expect(renderDocsFreshnessMarkdown(report)).toContain('- Terminal lifecycle entries: 7');
  });

  it('routes legacy tasks[] terminal task packet rows to lifecycle action', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-freshness-legacy-tasks-terminal-lifecycle-'));
    createdDirs.push(repoRoot);
    const specPath = 'tasks/specs/linear-legacy-terminal-spec.md';

    await mkdir(join(repoRoot, 'tasks', 'specs'), { recursive: true });
    await writeFile(join(repoRoot, specPath), '# Legacy Terminal Spec\n', 'utf8');
    await writeFile(
      join(repoRoot, 'tasks', 'index.json'),
      JSON.stringify(
        {
          items: [
            {
              id: '20260517-active-canonical-item',
              title: 'Active canonical item',
              status: 'in_progress',
              paths: {
                spec: 'tasks/specs/active-canonical-item.md'
              }
            }
          ],
          tasks: [
            {
              id: '20260517-linear-legacy-terminal-spec',
              title: 'Legacy terminal spec',
              status: 'done',
              completed_at: `${reviewDateDaysAgo(1)}T06:59:43.056Z`,
              paths: {
                spec: specPath,
                task: 'tasks/tasks-linear-legacy-terminal-spec.md'
              },
              source_issue: {
                identifier: 'CO-998'
              }
            }
          ]
        },
        null,
        2
      ),
      'utf8'
    );
    await writeDocsFreshnessFixture(repoRoot, {
      registryEntries: [
        {
          path: specPath,
          owner: 'Codex',
          status: 'active',
          last_review: reviewDateDaysAgo(45),
          cadence_days: 30
        }
      ],
      catalogPatterns: [{ glob: 'tasks/**/*.md', doc_class: 'task_packet' }]
    });

    const { report, hasFailures } = await runDocsFreshness(repoRoot, {
      outRoot: join(repoRoot, 'out'),
      taskId: 'fixture'
    });

    expect(hasFailures).toBe(true);
    expect(report.totals.stale_entries).toBe(0);
    expect(report.totals.terminal_lifecycle_entries).toBe(1);
    expect(report.terminal_lifecycle_entries).toEqual([
      expect.objectContaining({
        path: specPath,
        lifecycle_state: 'terminal_pending_archive',
        task_key: 'linear-legacy-terminal-spec',
        source_issue: expect.objectContaining({ identifier: 'CO-998' })
      })
    ]);
  });

  it('keeps archived legacy task-packet rows out of active stale and lifecycle debt', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-freshness-archived-legacy-packets-'));
    createdDirs.push(repoRoot);
    const taskKey = '1076-coordinator-symphony-aligned-telegram-question-read-adapter-assembly-extraction';
    const packetPaths = [
      `.agent/task/${taskKey}.md`,
      `docs/PRD-${taskKey}.md`,
      `docs/TECH_SPEC-${taskKey}.md`,
      `docs/ACTION_PLAN-${taskKey}.md`,
      `docs/findings/1076-telegram-question-read-adapter-assembly-extraction-deliberation.md`,
      `tasks/specs/${taskKey}.md`,
      `tasks/tasks-${taskKey}.md`
    ];

    await Promise.all([
      mkdir(join(repoRoot, '.agent', 'task'), { recursive: true }),
      mkdir(join(repoRoot, 'docs', 'findings'), { recursive: true }),
      mkdir(join(repoRoot, 'tasks', 'specs'), { recursive: true })
    ]);
    for (const packetPath of packetPaths) {
      await writeFile(join(repoRoot, packetPath), '# Archived historical packet\n', 'utf8');
    }
    await writeFile(
      join(repoRoot, 'tasks', 'index.json'),
      JSON.stringify(
        {
          items: [
            {
              id: '20260309-1076-coordinator-symphony-aligned-telegram-question-read-adapter-assembly-extraction',
              status: 'completed',
              completed_at: '2026-03-09',
              paths: {
                agent_task: `.agent/task/${taskKey}.md`,
                prd: `docs/PRD-${taskKey}.md`,
                docs: `docs/TECH_SPEC-${taskKey}.md`,
                action_plan: `docs/ACTION_PLAN-${taskKey}.md`,
                spec: `tasks/specs/${taskKey}.md`,
                task: `tasks/tasks-${taskKey}.md`
              }
            }
          ]
        },
        null,
        2
      ),
      'utf8'
    );
    await writeDocsFreshnessFixture(repoRoot, {
      registryEntries: packetPaths.map((packetPath) => ({
        path: packetPath,
        owner: 'Codex',
        status: 'archived',
        last_review: reviewDateDaysAgo(45),
        cadence_days: 30
      })),
      catalogPatterns: [
        { glob: '.agent/task/*.md', doc_class: 'task_mirror' },
        { glob: 'docs/findings/*.md', doc_class: 'report_only' },
        { glob: 'docs/*.md', doc_class: 'task_packet' },
        { glob: 'tasks/**/*.md', doc_class: 'task_packet' }
      ],
      catalogPolicies: {
        rolling_freshness_cohorts: rollingFreshnessPolicy({
          max_entries: 300,
          max_cohorts: 2,
          eligible_doc_classes: ['task_packet', 'task_mirror', 'report_only']
        })
      }
    });

    const { report, hasFailures } = await runDocsFreshness(repoRoot, {
      outRoot: join(repoRoot, 'out'),
      taskId: 'fixture'
    });

    expect(hasFailures).toBe(false);
    expect(report.totals.stale_entries).toBe(0);
    expect(report.totals.rolling_cohort_entries).toBe(0);
    expect(report.totals.terminal_lifecycle_entries).toBe(0);
    expect(report.totals.invalid_entries).toBe(0);
    expect(report.totals.missing_on_disk).toBe(0);
  });

  it('keeps archived terminal packet rows out of active docs freshness debt', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-freshness-archived-terminal-'));
    createdDirs.push(repoRoot);
    const taskKey = 'linear-archived-terminal';
    const packetPaths = [
      `.agent/task/${taskKey}.md`,
      `docs/PRD-${taskKey}.md`,
      `docs/TECH_SPEC-${taskKey}.md`,
      `docs/ACTION_PLAN-${taskKey}.md`,
      `tasks/specs/${taskKey}.md`,
      `tasks/tasks-${taskKey}.md`
    ];

    await Promise.all([
      mkdir(join(repoRoot, '.agent', 'task'), { recursive: true }),
      mkdir(join(repoRoot, 'docs'), { recursive: true }),
      mkdir(join(repoRoot, 'tasks', 'specs'), { recursive: true })
    ]);
    for (const packetPath of packetPaths) {
      await writeFile(join(repoRoot, packetPath), '# Archived Terminal Packet\n', 'utf8');
    }
    await writeFile(
      join(repoRoot, 'tasks', 'index.json'),
      JSON.stringify(
        {
          items: [
            {
              id: `20260513-${taskKey}`,
              status: 'completed',
              completed_at: reviewDateDaysAgo(1),
              relates_to: `tasks/tasks-${taskKey}.md`,
              paths: {
                agent_task: `.agent/task/${taskKey}.md`,
                prd: `docs/PRD-${taskKey}.md`,
                docs: `docs/TECH_SPEC-${taskKey}.md`,
                action_plan: `docs/ACTION_PLAN-${taskKey}.md`,
                spec: `tasks/specs/${taskKey}.md`,
                task: `tasks/tasks-${taskKey}.md`
              }
            }
          ]
        },
        null,
        2
      ),
      'utf8'
    );
    await writeDocsFreshnessFixture(repoRoot, {
      registryEntries: packetPaths.map((packetPath) => ({
        path: packetPath,
        owner: 'Codex',
        status: 'archived',
        lifecycle_state: 'archived',
        last_review: reviewDateDaysAgo(45),
        cadence_days: 30,
        archived_at: reviewDateDaysAgo(1),
        archive_reason: 'Fixture terminal packet retained as history.'
      })),
      catalogPatterns: [
        { glob: '.agent/task/*.md', doc_class: 'task_mirror' },
        { glob: 'docs/*.md', doc_class: 'task_packet' },
        { glob: 'tasks/**/*.md', doc_class: 'task_packet' }
      ],
      catalogPolicies: {
        rolling_freshness_cohorts: rollingFreshnessPolicy({ max_entries: 300 })
      }
    });

    const { report, hasFailures } = await runDocsFreshness(repoRoot, {
      outRoot: join(repoRoot, 'out'),
      taskId: 'fixture'
    });

    expect(hasFailures).toBe(false);
    expect(report.totals.stale_entries).toBe(0);
    expect(report.totals.rolling_cohort_entries).toBe(0);
    expect(report.totals.terminal_lifecycle_entries).toBe(0);
  });

  it('keeps archived rows with closed task status out of active docs freshness debt', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-freshness-archived-closed-task-status-'));
    createdDirs.push(repoRoot);
    const packetPath = 'tasks/tasks-1234-closed.md';

    await mkdir(join(repoRoot, 'tasks'), { recursive: true });
    await writeFile(join(repoRoot, packetPath), '# Closed Packet\n', 'utf8');
    await writeDocsFreshnessFixture(repoRoot, {
      registryEntries: [
        {
          path: packetPath,
          owner: 'Codex',
          status: 'archived',
          lifecycle_state: 'archived',
          task_status: 'closed',
          last_review: reviewDateDaysAgo(31),
          cadence_days: 30
        }
      ],
      catalogPatterns: [{ glob: 'tasks/**/*.md', doc_class: 'task_packet' }],
      catalogPolicies: {
        rolling_freshness_cohorts: rollingFreshnessPolicy({ max_entries: 300 })
      }
    });

    const { report, hasFailures } = await runDocsFreshness(repoRoot, {
      outRoot: join(repoRoot, 'out'),
      taskId: 'fixture'
    });

    expect(hasFailures).toBe(false);
    expect(report.totals.stale_entries).toBe(0);
    expect(report.totals.rolling_cohort_entries).toBe(0);
    expect(report.totals.terminal_lifecycle_entries).toBe(0);
  });

  it('routes fresh active registry-only terminal task status rows to terminal lifecycle action', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-freshness-active-terminal-task-status-fresh-'));
    createdDirs.push(repoRoot);
    const packetPath = 'tasks/tasks-1234-closed.md';

    await mkdir(join(repoRoot, 'tasks'), { recursive: true });
    await writeFile(join(repoRoot, packetPath), '# Closed Packet\n', 'utf8');
    await writeDocsFreshnessFixture(repoRoot, {
      registryEntries: [
        {
          path: packetPath,
          owner: 'Codex',
          status: 'active',
          task_status: 'closed',
          last_review: reviewDateDaysAgo(1),
          cadence_days: 30
        }
      ],
      catalogPatterns: [{ glob: 'tasks/**/*.md', doc_class: 'task_packet' }],
      catalogPolicies: {
        rolling_freshness_cohorts: rollingFreshnessPolicy({ max_entries: 300 })
      }
    });

    const { report, hasFailures } = await runDocsFreshness(repoRoot, {
      outRoot: join(repoRoot, 'out'),
      taskId: 'fixture'
    });

    expect(hasFailures).toBe(true);
    expect(report.totals.stale_entries).toBe(0);
    expect(report.totals.rolling_cohort_entries).toBe(0);
    expect(report.totals.terminal_lifecycle_entries).toBe(1);
    expect(report.terminal_lifecycle_entries).toEqual([
      expect.objectContaining({
        path: packetPath,
        registry_status: 'active',
        task_status: 'closed',
        status: 'closed',
        lifecycle_state: 'terminal_pending_archive',
        overdue_days: 0,
        recommended_action: 'archive_or_reclassify_terminal_packet'
      })
    ]);
  });

  it('keeps overdue active registry-only terminal task status rows out of rolling capacity', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-freshness-active-terminal-task-status-overdue-'));
    createdDirs.push(repoRoot);
    const packetPath = 'tasks/tasks-1234-completed.md';

    await mkdir(join(repoRoot, 'tasks'), { recursive: true });
    await writeFile(join(repoRoot, packetPath), '# Completed Packet\n', 'utf8');
    await writeDocsFreshnessFixture(repoRoot, {
      registryEntries: [
        {
          path: packetPath,
          owner: 'Codex',
          status: 'active',
          task_status: 'completed',
          last_review: reviewDateDaysAgo(31),
          cadence_days: 30
        }
      ],
      catalogPatterns: [{ glob: 'tasks/**/*.md', doc_class: 'task_packet' }],
      catalogPolicies: {
        rolling_freshness_cohorts: rollingFreshnessPolicy({ max_entries: 300 })
      }
    });

    const { report, hasFailures } = await runDocsFreshness(repoRoot, {
      outRoot: join(repoRoot, 'out'),
      taskId: 'fixture'
    });

    expect(hasFailures).toBe(true);
    expect(report.totals.stale_entries).toBe(0);
    expect(report.totals.rolling_cohort_entries).toBe(0);
    expect(report.totals.terminal_lifecycle_entries).toBe(1);
    expect(report.terminal_lifecycle_entries).toEqual([
      expect.objectContaining({
        path: packetPath,
        registry_status: 'active',
        task_status: 'completed',
        status: 'completed',
        lifecycle_state: 'terminal_pending_archive',
        overdue_days: 1,
        recommended_action: 'archive_or_reclassify_terminal_packet'
      })
    ]);
  });

  it('keeps archived rows with explicit nonterminal task status in live rolling freshness input', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-freshness-archived-nonterminal-'));
    createdDirs.push(repoRoot);
    const packetPath = 'tasks/tasks-1234-nonterminal.md';

    await mkdir(join(repoRoot, 'tasks'), { recursive: true });
    await writeFile(join(repoRoot, packetPath), '# Nonterminal Packet\n', 'utf8');
    await writeDocsFreshnessFixture(repoRoot, {
      registryEntries: [
        {
          path: packetPath,
          owner: 'Codex',
          status: 'archived',
          task_status: 'in-progress',
          last_review: reviewDateDaysAgo(31),
          cadence_days: 30
        }
      ],
      catalogPatterns: [{ glob: 'tasks/**/*.md', doc_class: 'task_packet' }],
      catalogPolicies: {
        rolling_freshness_cohorts: rollingFreshnessPolicy({ max_entries: 300 })
      }
    });

    const { report, hasFailures } = await runDocsFreshness(repoRoot, {
      outRoot: join(repoRoot, 'out'),
      taskId: 'fixture'
    });

    expect(hasFailures).toBe(false);
    expect(report.totals.stale_entries).toBe(0);
    expect(report.totals.rolling_cohort_entries).toBe(1);
    expect(report.rolling_cohort_entries).toEqual([
      expect.objectContaining({
        path: packetPath,
        registry_status: 'archived',
        task_status: 'in-progress',
        baseline_cohort_id: 'fixture-rolling-baseline'
      })
    ]);
  });

  it('routes slug-only docs packet rows when terminal task keys carry numeric prefixes', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-freshness-slug-only-terminal-lifecycle-'));
    createdDirs.push(repoRoot);
    const slugOnlyTaskKey = 'terminal-slug-only';
    const packetPaths = [
      `docs/PRD-${slugOnlyTaskKey}.md`,
      `docs/TECH_SPEC-${slugOnlyTaskKey}.md`,
      `docs/ACTION_PLAN-${slugOnlyTaskKey}.md`
    ];

    await Promise.all([
      mkdir(join(repoRoot, 'docs'), { recursive: true }),
      mkdir(join(repoRoot, 'tasks'), { recursive: true })
    ]);
    for (const packetPath of packetPaths) {
      await writeFile(join(repoRoot, packetPath), '# Terminal Slug-Only Packet\n', 'utf8');
    }
    await writeFile(
      join(repoRoot, 'tasks', 'index.json'),
      JSON.stringify(
        {
          items: [
            {
              id: '0981',
              slug: slugOnlyTaskKey,
              status: 'done',
              completed_at: reviewDateDaysAgo(1)
            }
          ]
        },
        null,
        2
      ),
      'utf8'
    );
    await writeDocsFreshnessFixture(repoRoot, {
      registryEntries: packetPaths.map((packetPath) => ({
        path: packetPath,
        owner: 'Codex',
        status: 'active',
        last_review: reviewDateDaysAgo(45),
        cadence_days: 30
      })),
      catalogPatterns: [{ glob: 'docs/*.md', doc_class: 'task_packet' }]
    });

    const { report, hasFailures } = await runDocsFreshness(repoRoot, {
      outRoot: join(repoRoot, 'out'),
      taskId: 'fixture'
    });

    expect(hasFailures).toBe(true);
    expect(report.totals.stale_entries).toBe(0);
    expect(report.totals.terminal_lifecycle_entries).toBe(3);
    expect(report.terminal_lifecycle_entries).toEqual(
      expect.arrayContaining(
        packetPaths.map((packetPath) =>
          expect.objectContaining({
            path: packetPath,
            lifecycle_state: 'terminal_pending_archive',
            task_key: `0981-${slugOnlyTaskKey}`
          })
        )
      )
    );
  });

  it('does not strip numeric-leading task slugs that are not prefixed by task id', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-freshness-numeric-leading-slug-'));
    createdDirs.push(repoRoot);
    const docPath = 'docs/PRD-roadmap.md';

    await Promise.all([
      mkdir(join(repoRoot, 'docs'), { recursive: true }),
      mkdir(join(repoRoot, 'tasks'), { recursive: true })
    ]);
    await writeFile(join(repoRoot, docPath), '# Roadmap\n', 'utf8');
    await writeFile(
      join(repoRoot, 'tasks', 'index.json'),
      JSON.stringify(
        {
          items: [
            {
              slug: '2026-roadmap',
              status: 'done',
              completed_at: reviewDateDaysAgo(1)
            }
          ]
        },
        null,
        2
      ),
      'utf8'
    );
    await writeDocsFreshnessFixture(repoRoot, {
      registryEntries: [
        {
          path: docPath,
          owner: 'Codex',
          status: 'active',
          last_review: reviewDateDaysAgo(45),
          cadence_days: 30
        }
      ],
      catalogPatterns: [{ glob: 'docs/*.md', doc_class: 'task_packet' }]
    });

    const { report, hasFailures } = await runDocsFreshness(repoRoot, {
      outRoot: join(repoRoot, 'out'),
      taskId: 'fixture'
    });

    expect(hasFailures).toBe(true);
    expect(report.totals.terminal_lifecycle_entries).toBe(0);
    expect(report.totals.stale_entries).toBe(1);
    expect(report.stale_entries).toEqual([
      expect.objectContaining({
        path: docPath,
        path_family: 'docs/PRD-*'
      })
    ]);
  });

  it('routes fresh terminal task packet rows to lifecycle action before stale age', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-freshness-fresh-terminal-lifecycle-'));
    createdDirs.push(repoRoot);
    const taskKey = 'linear-fresh-terminal';
    const packetPath = `tasks/tasks-${taskKey}.md`;

    await Promise.all([
      mkdir(join(repoRoot, 'tasks'), { recursive: true }),
      mkdir(join(repoRoot, 'tasks', 'specs'), { recursive: true })
    ]);
    await writeFile(join(repoRoot, packetPath), '# Fresh Terminal Packet\n', 'utf8');
    await writeFile(
      join(repoRoot, 'tasks', 'index.json'),
      JSON.stringify(
        {
          items: [
            {
              id: `20260501-${taskKey}`,
              status: 'done',
              completed_at: reviewDateDaysAgo(1),
              relates_to: packetPath,
              paths: {
                task: packetPath
              }
            }
          ]
        },
        null,
        2
      ),
      'utf8'
    );
    await writeDocsFreshnessFixture(repoRoot, {
      registryEntries: [
        {
          path: packetPath,
          owner: 'Codex',
          status: 'active',
          last_review: reviewDateDaysAgo(1),
          cadence_days: 30
        }
      ],
      catalogPatterns: [{ glob: 'tasks/**/*.md', doc_class: 'task_packet' }]
    });

    const { report, hasFailures } = await runDocsFreshness(repoRoot, {
      outRoot: join(repoRoot, 'out'),
      taskId: 'fixture'
    });

    expect(hasFailures).toBe(true);
    expect(report.totals.stale_entries).toBe(0);
    expect(report.totals.terminal_lifecycle_entries).toBe(1);
    expect(report.terminal_lifecycle_entries).toEqual([
      expect.objectContaining({
        path: packetPath,
        lifecycle_state: 'terminal_pending_archive',
        overdue_days: 0,
        recommended_action: 'archive_or_reclassify_terminal_packet'
      })
    ]);
  });

  it('keeps explicit terminal_pending_archive registry rows blocking before stale age', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-freshness-explicit-terminal-pending-'));
    createdDirs.push(repoRoot);
    const packetPath = 'tasks/tasks-explicit-terminal-pending.md';

    await mkdir(join(repoRoot, 'tasks'), { recursive: true });
    await writeFile(join(repoRoot, packetPath), '# Explicit Terminal Pending Packet\n', 'utf8');
    await writeDocsFreshnessFixture(repoRoot, {
      registryEntries: [
        {
          path: packetPath,
          owner: 'Codex',
          status: 'terminal_pending_archive',
          last_review: reviewDateDaysAgo(1),
          cadence_days: 30
        }
      ],
      catalogPatterns: [{ glob: 'tasks/**/*.md', doc_class: 'task_packet' }]
    });

    const { report, hasFailures } = await runDocsFreshness(repoRoot, {
      outRoot: join(repoRoot, 'out'),
      taskId: 'fixture'
    });

    expect(hasFailures).toBe(true);
    expect(report.totals.stale_entries).toBe(0);
    expect(report.totals.terminal_lifecycle_entries).toBe(1);
    expect(report.terminal_lifecycle_entries).toEqual([
      expect.objectContaining({
        path: packetPath,
        registry_status: 'terminal_pending_archive',
        lifecycle_state: 'terminal_pending_archive',
        recommended_action: 'archive_or_reclassify_terminal_packet',
        task_key: null,
        overdue_days: 0
      })
    ]);
  });

  it('keeps undeclared same-class stale docs as blocking failures', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-freshness-rolling-undeclared-'));
    createdDirs.push(repoRoot);

    await writeRollingDocsFixture(repoRoot, {
      entries: [{ path: 'tasks/tasks-9999-new-feature.md', daysOld: 31 }]
    });

    const { report, hasFailures } = await runDocsFreshness(repoRoot, {
      outRoot: join(repoRoot, 'out'),
      taskId: 'fixture'
    });

    expect(hasFailures).toBe(true);
    expect(report.totals.stale_entries).toBe(1);
    expect(report.totals.rolling_cohort_entries).toBe(0);
    expect(report.stale_entries).toEqual([
      expect.objectContaining({
        path: 'tasks/tasks-9999-new-feature.md',
        doc_class: 'task_packet',
        overdue_days: 1
      })
    ]);
  });

  it('reports declared path-prefix stale docs as rolling cohort debt without task numbers', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-freshness-rolling-prefix-'));
    createdDirs.push(repoRoot);
    const docPath = 'docs/PRD-baseline-packet.md';

    await mkdir(join(repoRoot, 'docs'), { recursive: true });
    await writeFile(join(repoRoot, docPath), '# Baseline packet\n', 'utf8');
    await writeDocsFreshnessFixture(repoRoot, {
      registryEntries: [
        {
          path: docPath,
          owner: 'Codex',
          status: 'active',
          last_review: reviewDateDaysAgo(31),
          cadence_days: 30
        }
      ],
      catalogPatterns: [{ glob: 'docs/PRD-*.md', doc_class: 'task_packet' }],
      catalogPolicies: {
        rolling_freshness_cohorts: rollingFreshnessPolicy({
          baseline_cohorts: [
            {
              id: 'fixture-prefix-baseline',
              last_review: reviewDateDaysAgo(31),
              cadence_days: 30,
              path_families: ['docs/PRD-*'],
              path_prefixes: ['docs/PRD-baseline-']
            }
          ]
        })
      }
    });

    const { report, hasFailures } = await runDocsFreshness(repoRoot, {
      outRoot: join(repoRoot, 'out'),
      taskId: 'fixture'
    });

    expect(hasFailures).toBe(false);
    expect(report.totals.stale_entries).toBe(0);
    expect(report.totals.rolling_cohort_entries).toBe(1);
    expect(report.rolling_cohort_entries).toEqual([
      expect.objectContaining({ path: docPath, baseline_cohort_id: 'fixture-prefix-baseline' })
    ]);
  });

  it('keeps expired rolling cohort candidates as blocking failures', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-freshness-rolling-expired-'));
    createdDirs.push(repoRoot);

    await writeRollingDocsFixture(repoRoot, {
      entries: [{ path: 'tasks/tasks-1234-example.md', daysOld: 45 }],
      policy: rollingFreshnessPolicy({
        baseline_cohorts: [
          {
            id: 'fixture-expired-baseline',
            last_review: reviewDateDaysAgo(45),
            cadence_days: 30,
            path_families: ['tasks/tasks-*'],
            task_number_range: { start: '1234', end: '1234' }
          }
        ]
      })
    });

    const { report, hasFailures } = await runDocsFreshness(repoRoot, {
      outRoot: join(repoRoot, 'out'),
      taskId: 'fixture'
    });

    expect(hasFailures).toBe(true);
    expect(report.totals.stale_entries).toBe(1);
    expect(report.totals.rolling_cohort_entries).toBe(0);
    expect(report.stale_entries).toEqual([
      expect.objectContaining({
        path: 'tasks/tasks-1234-example.md',
        doc_class: 'task_packet',
        overdue_days: 15
      })
    ]);
  });

  it('keeps over-budget rolling cohort candidates as blocking failures', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-freshness-rolling-over-budget-'));
    createdDirs.push(repoRoot);

    await writeRollingDocsFixture(repoRoot, {
      entries: [{ path: 'tasks/tasks-1234-example.md' }, { path: 'tasks/tasks-1235-example.md' }],
      policy: rollingFreshnessPolicy({ max_entries: 1 })
    });

    const { report, hasFailures } = await runDocsFreshness(repoRoot, {
      outRoot: join(repoRoot, 'out'),
      taskId: 'fixture'
    });

    expect(hasFailures).toBe(true);
    expect(report.totals.stale_entries).toBe(2);
    expect(report.totals.rolling_cohort_entries).toBe(0);
    expect(report.stale_entries).toEqual([
      expect.objectContaining({ path: 'tasks/tasks-1234-example.md' }),
      expect.objectContaining({ path: 'tasks/tasks-1235-example.md' })
    ]);
  });

  it('keeps too many rolling cohorts as blocking failures', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-freshness-rolling-too-many-cohorts-'));
    createdDirs.push(repoRoot);

    await writeRollingDocsFixture(repoRoot, {
      entries: [
        { path: 'tasks/tasks-1234-example.md', daysOld: 31 },
        { path: 'tasks/tasks-1235-example.md', daysOld: 32 }
      ],
      policy: rollingFreshnessPolicy({
        max_cohorts: 1,
        max_entries: 10,
        baseline_cohorts: [
          {
            id: 'fixture-rolling-baseline-31',
            last_review: reviewDateDaysAgo(31),
            cadence_days: 30,
            path_families: ['tasks/tasks-*'],
            task_number_range: { start: '1234', end: '1234' }
          },
          {
            id: 'fixture-rolling-baseline-32',
            last_review: reviewDateDaysAgo(32),
            cadence_days: 30,
            path_families: ['tasks/tasks-*'],
            task_number_range: { start: '1235', end: '1235' }
          }
        ]
      })
    });

    const { report, hasFailures } = await runDocsFreshness(repoRoot, {
      outRoot: join(repoRoot, 'out'),
      taskId: 'fixture'
    });

    expect(hasFailures).toBe(true);
    expect(report.totals.stale_entries).toBe(2);
    expect(report.totals.rolling_cohort_entries).toBe(0);
    expect(report.stale_entries).toEqual([
      expect.objectContaining({ path: 'tasks/tasks-1234-example.md' }),
      expect.objectContaining({ path: 'tasks/tasks-1235-example.md' })
    ]);
  });

  it('keeps stale docs blocking when rolling policy classes are invalid', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-freshness-rolling-invalid-classes-'));
    createdDirs.push(repoRoot);

    await writeRollingDocsFixture(repoRoot, {
      policy: rollingFreshnessPolicy({ eligible_doc_classes: [] })
    });

    const { report, hasFailures } = await runDocsFreshness(repoRoot, {
      outRoot: join(repoRoot, 'out'),
      taskId: 'fixture'
    });

    expect(hasFailures).toBe(true);
    expect(report.rolling_freshness_policy).toEqual(expect.objectContaining({ enabled: true, is_valid: false }));
    expect(report.totals.stale_entries).toBe(1);
    expect(report.totals.rolling_cohort_entries).toBe(0);
  });

  it('keeps stale docs blocking when canonical owner overrides are malformed', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'docs-freshness-rolling-invalid-canonical-owners-'));
    createdDirs.push(repoRoot);

    await writeRollingDocsFixture(repoRoot, {
      policy: rollingFreshnessPolicy({
        canonical_owner_issues: {
          canonical_owner_key: 'docs_freshness_candidate|doc_class:task_packet|path_family:tasks/tasks-*',
          owner_issue: 'CO-320'
        }
      })
    });

    const { report, hasFailures } = await runDocsFreshness(repoRoot, {
      outRoot: join(repoRoot, 'out'),
      taskId: 'fixture'
    });

    expect(hasFailures).toBe(true);
    expect(report.rolling_freshness_policy).toEqual(
      expect.objectContaining({ enabled: true, is_valid: false, canonical_owner_issues: [] })
    );
    expect(report.totals.stale_entries).toBe(1);
    expect(report.totals.rolling_cohort_entries).toBe(0);
  });
});
