import { mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import {
  CONTROL_PLANE_INVARIANTS_SCHEMA,
  CONTROL_PLANE_INVARIANTS_VERSION,
  runControlPlaneInvariants
} from '../scripts/control-plane-invariants.mjs';

const createdDirs: string[] = [];

afterEach(async () => {
  while (createdDirs.length > 0) {
    const dir = createdDirs.pop();
    if (dir) {
      await rm(dir, { recursive: true, force: true });
    }
  }
});

describe('control-plane operational drift invariants', () => {
  it('passes when the catalog preserves the CO-552 control-plane invariants', async () => {
    const repoRoot = await writeFixture();

    const { report, hasFailures } = await runControlPlaneInvariants(repoRoot, {
      outputPath: false
    });

    expect(hasFailures).toBe(false);
    expect(report.status).toBe('passed');
    expect(report.invariants.desired_state_domains).toEqual(
      expect.arrayContaining(['wip_cap', 'goal_duplication', 'linear_relation_label'])
    );
  });

  it('fails closed when dry-run and non-dry guard semantics diverge', async () => {
    const repoRoot = await writeFixture({
      mutateConfig(config) {
        config.guard_contracts[0].dry_run.rule_engine = 'dry-run-only-rules';
      }
    });

    const { report, hasFailures } = await runControlPlaneInvariants(repoRoot, {
      outputPath: false
    });

    expect(hasFailures).toBe(true);
    expect(report.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'guard_dry_run_non_dry_semantics_diverge'
        })
      ])
    );
  });

  it('rejects prose-only fallback metadata contracts', async () => {
    const repoRoot = await writeFixture({
      mutateConfig(config) {
        config.fallback_refactor_metadata.parser = 'markdown_prose';
        config.fallback_refactor_metadata.fail_closed_inputs = ['missing_owner'];
      }
    });

    const { report, hasFailures } = await runControlPlaneInvariants(repoRoot, {
      outputPath: false
    });

    expect(hasFailures).toBe(true);
    expect(report.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'fallback_metadata_parser_not_schema_validated'
        }),
        expect.objectContaining({
          code: 'fallback_metadata_fail_closed_input_missing'
        })
      ])
    );
  });

  it('fails when the linked packet is missing registry truth', async () => {
    const repoRoot = await writeFixture({
      registryEntries: []
    });

    const { report, hasFailures } = await runControlPlaneInvariants(repoRoot, {
      outputPath: false
    });

    expect(hasFailures).toBe(true);
    expect(report.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'freshness_registry_entry_missing'
        })
      ])
    );
  });

  it('fails when task-index packet paths drift from the catalog', async () => {
    const repoRoot = await writeFixture({
      mutateTaskIndex(entry) {
        const paths = entry.paths as Record<string, string>;
        paths.spec = 'tasks/specs/wrong-co552-spec.md';
      }
    });

    const { report, hasFailures } = await runControlPlaneInvariants(repoRoot, {
      outputPath: false
    });

    expect(hasFailures).toBe(true);
    expect(report.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'task_registry_path_mismatch'
        })
      ])
    );
  });

  it('rejects absolute task packet paths', async () => {
    const repoRoot = await writeFixture();
    const config = buildValidConfig();
    config.task_packet.paths[0] = '/tmp/co552-absolute-packet.md';
    await writeJson(join(repoRoot, 'docs', 'control-plane-invariants.json'), config);

    const { report, hasFailures } = await runControlPlaneInvariants(repoRoot, {
      outputPath: false
    });

    expect(hasFailures).toBe(true);
    expect(report.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'task_packet_path_invalid'
        })
      ])
    );
  });
});

async function writeFixture(options: {
  mutateConfig?: (config: ReturnType<typeof buildValidConfig>) => void;
  mutateTaskIndex?: (
    entry: Record<string, unknown>,
    config: ReturnType<typeof buildValidConfig>
  ) => void;
  registryEntries?: Array<Record<string, unknown>>;
} = {}) {
  const repoRoot = await mkdirFixture();
  const config = buildValidConfig();
  options.mutateConfig?.(config);
  const packetPaths = config.task_packet.paths;

  await writeJson(join(repoRoot, 'docs', 'control-plane-invariants.json'), config);
  await Promise.all(
    packetPaths.map(async (path) => {
      await mkdir(dirname(join(repoRoot, path)), { recursive: true });
      await writeFile(join(repoRoot, path), '# Fixture\n', 'utf8');
    })
  );
  const taskIndexEntry: Record<string, unknown> = {
    id: config.task_packet.task_registry_id,
    title: 'CO-552 recurring operational drift invariants',
    relates_to: packetPaths[4],
    status: config.task_packet.expected_task_status,
    paths: {
      spec: packetPaths[3],
      task: packetPaths[4],
      agent_task: packetPaths[5],
      prd: packetPaths[0],
      docs: packetPaths[1],
      action_plan: packetPaths[2]
    }
  };
  options.mutateTaskIndex?.(taskIndexEntry, config);
  await writeJson(join(repoRoot, 'tasks', 'index.json'), {
    items: [
      taskIndexEntry
    ]
  });
  await writeJson(join(repoRoot, 'docs', 'docs-freshness-registry.json'), {
    version: 1,
    entries:
      options.registryEntries ??
      packetPaths.map((path) => ({
        path,
        owner: 'Codex',
        status: 'active',
        lifecycle_state: 'active',
        last_review: '2026-05-20',
        cadence_days: 30
      }))
  });
  return repoRoot;
}

async function mkdirFixture() {
  const repoRoot = join(tmpdir(), `control-plane-invariants-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  createdDirs.push(repoRoot);
  await mkdir(join(repoRoot, 'docs'), { recursive: true });
  await mkdir(join(repoRoot, 'tasks'), { recursive: true });
  return repoRoot;
}

async function writeJson(path: string, value: unknown) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function buildValidConfig() {
  return {
    schema_id: CONTROL_PLANE_INVARIANTS_SCHEMA,
    schema_version: CONTROL_PLANE_INVARIANTS_VERSION,
    owner: 'CO-552',
    updated_at: '2026-05-20',
    canonical_owner_key: 'co-control-plane:recurring-operational-drift:invariants:v1',
    canonical_owner_marker:
      'codex-orchestrator:canonical-owner-key=co-control-plane:recurring-operational-drift:invariants:v1',
    task_packet: {
      task_registry_id: '20260520-linear-46ef15a6-8118-4534-9efe-31eaa9d9ab36',
      expected_task_status: 'in_progress',
      paths: [
        'docs/PRD-linear-46ef15a6-8118-4534-9efe-31eaa9d9ab36.md',
        'docs/TECH_SPEC-linear-46ef15a6-8118-4534-9efe-31eaa9d9ab36.md',
        'docs/ACTION_PLAN-linear-46ef15a6-8118-4534-9efe-31eaa9d9ab36.md',
        'tasks/specs/linear-46ef15a6-8118-4534-9efe-31eaa9d9ab36.md',
        'tasks/tasks-linear-46ef15a6-8118-4534-9efe-31eaa9d9ab36.md',
        '.agent/task/linear-46ef15a6-8118-4534-9efe-31eaa9d9ab36.md'
      ]
    },
    task_spec_lifecycle: {
      canonical_state_source: 'tasks/index.json items[].status plus docs/docs-freshness-registry lifecycle_state',
      states: ['active', 'blocked', 'terminal', 'archived', 'reopened'],
      terminal: {
        excluded_from: ['active_freshness_cap', 'fallback_expiry', 'provider_worker_blocking']
      },
      reopen_requires: ['live Linear transition', 'registry lifecycle reset', 'fresh review evidence']
    },
    guard_contracts: [
      {
        id: 'spec_guard',
        dry_run: {
          selector_engine: 'spec-guard-selector-v1',
          rule_engine: 'spec-guard-rules-v1',
          validation_semantics: 'full',
          writes: false
        },
        non_dry: {
          selector_engine: 'spec-guard-selector-v1',
          rule_engine: 'spec-guard-rules-v1',
          validation_semantics: 'full',
          writes: true
        },
        tests: ['tests/spec-guard.spec.ts']
      }
    ],
    fallback_refactor_metadata: {
      parser: 'schema_validated',
      required_fields: [
        'surface',
        'fallback',
        'decision',
        'owner',
        'trigger',
        'introduced_date',
        'review_date',
        'maximum_lifetime',
        'removal_condition',
        'validation'
      ],
      fail_closed_inputs: ['prose_only', 'markdown_table_variant', 'missing_owner', 'expired_without_review']
    },
    desired_state_reconciler: {
      domains: [
        { id: 'wip_cap', authority: 'live Linear plus provider intake', drift_action: 'report_or_repair' },
        { id: 'process_lease', authority: 'lease metadata', drift_action: 'surface_or_reap' },
        { id: 'goal_duplication', authority: 'Linear issue lease', drift_action: 'fail_closed' },
        { id: 'shared_root_branch', authority: 'git status', drift_action: 'surface' },
        { id: 'stale_worker_branch', authority: 'git and Linear state', drift_action: 'surface_or_reap' },
        { id: 'review', authority: 'current PR head SHA', drift_action: 'invalidate_stale' },
        { id: 'linear_relation_label', authority: 'live Linear GraphQL', drift_action: 'repair_or_fail' }
      ]
    },
    codex_review_automation: {
      keyed_by: 'pr_head_sha',
      new_head_invalidates_approval: true,
      manual_trigger_idempotency: 'once_per_head_sha',
      state_fields: ['current_head_sha', 'approval_state', 'finding_state', 'manual_trigger_attempts']
    },
    linear_hygiene: {
      builds_on: ['CO-509', 'CO-538'],
      creation_requires_live_label_ids: true,
      reconciler_verifies_live_relations: true
    },
    review_workflow: {
      checks: ['original_spec', 'coding_standards', 'required_code_changes', 'creating_agent_loop'],
      proposal_classes: ['code_change_proposals', 'agent_loop_proposals']
    },
    status_monitor: {
      dimensions: ['issue_state', 'goal_state', 'process_agent_state', 'branch_posture', 'review_state', 'gate_state'],
      goal_policy: {
        max_active_goals_per_linear_issue: 1,
        overlap_detection: 'fail_closed'
      }
    },
    child_workstreams: [
      { id: 'canonical_task_spec_lifecycle', owner_surface: 'docs freshness/spec guard' },
      { id: 'guard_contract', owner_surface: 'guard runners' },
      { id: 'desired_state_reconciler', owner_surface: 'control host status' },
      { id: 'sha_bound_review', owner_surface: 'review automation' },
      { id: 'linear_hygiene', owner_surface: 'Linear helpers' },
      { id: 'review_quality', owner_surface: 'review wrapper' }
    ]
  };
}
