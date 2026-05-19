import { existsSync } from 'node:fs';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  buildQuotaHygieneAudit,
  parseProcessInventory,
  type QuotaHygieneProcessRecord
} from '../src/cli/quotaHygieneCliShell.js';

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { force: true, recursive: true })));
});

describe('quota hygiene audit', () => {
  it('classifies active-like provider-intake claims as stale without live corroboration', async () => {
    const audit = await buildQuotaHygieneAudit({
      flags: { 'provider-intake-state': '/provider/provider-intake-state.json' },
      dependencies: baseDependencies({
        readTextFile: async (path) => {
          if (path === '/provider/provider-intake-state.json') {
            return JSON.stringify(providerIntakeState({
              state: 'running',
              issueIdentifier: 'CO-510',
              taskId: 'linear-co510'
            }));
          }
          return defaultProviderState();
        }
      })
    });

    expect(audit.provider_intake.active_like_count).toBe(1);
    expect(audit.provider_intake.stale_unconfirmed_count).toBe(1);
    expect(audit.provider_intake.claims[0]).toMatchObject({
      issue_identifier: 'CO-510',
      classification: 'stale_unconfirmed',
      corroboration: {
        process_pids: [],
        co_status_tokens: []
      }
    });
    expect(audit.findings.map((finding) => finding.code)).toContain(
      'stale_provider_intake_claims_unconfirmed'
    );
  });

  it('treats app-managed active-unassociated delegate-server inventory as idle infrastructure', async () => {
    const audit = await buildQuotaHygieneAudit({
      flags: {},
      dependencies: baseDependencies({
        inspectDelegateServerProcesses: () => ({
          status: 'ok',
          activeCount: 1,
          staleCount: 0,
          activePids: [4242],
          stalePids: [],
          staleRssKb: 0,
          thresholdSeconds: 600,
          detail: 'active unassociated app-managed delegate server',
          details: [
            {
              pid: 4242,
              ppid: 100,
              elapsedSeconds: 60,
              rssKb: 4096,
              command: 'node /repo/dist/bin/codex-orchestrator.js delegate-server',
              cwd: '/repo',
              parentPid: 100,
              parentCommand: 'Codex app-server',
              parentCwd: '/repo',
              rootCodexParentPid: 100,
              rootCodexParentCommand: 'Codex app-server',
              rootCodexParentCwd: '/repo',
              manifestAssociation: null,
              classification: 'active-unassociated',
              classificationDetail: 'delegate-server is app-managed infrastructure'
            }
          ]
        })
      })
    });

    expect(audit.delegation.false_positive_classification).toBe('idle_infrastructure');
    expect(audit.delegation.risk).toBe('green');
    expect(audit.findings.map((finding) => finding.code)).not.toContain(
      'stale_delegate_server_process'
    );
  });

  it('distinguishes an unloaded launchd-supervised control-host', async () => {
    const audit = await buildQuotaHygieneAudit({
      flags: {},
      dependencies: baseDependencies({
        readControlHostSupervisionStatus: async () => ({
          installed: true,
          service: {
            loaded: false
          },
          live_host: null
        })
      })
    });

    expect(audit.control_host.status).toBe('unloaded');
    expect(audit.findings.map((finding) => finding.code)).toContain('control_host_unloaded');
  });

  it('reports active automations with degraded quota-risk classification', async () => {
    const root = await mkdtemp(join(tmpdir(), 'quota-hygiene-automations-'));
    tempDirs.push(root);
    const automationDir = join(root, 'co-orchestration-watcher');
    await mkdir(automationDir, { recursive: true });
    await writeFile(
      join(automationDir, 'automation.toml'),
      [
        'status = "active"',
        'prompt = "watch quota recovery"',
        'target_thread_id = "thread-1"'
      ].join('\n'),
      'utf8'
    );

    const audit = await buildQuotaHygieneAudit({
      flags: { 'automations-dir': root },
      dependencies: baseDependencies({
        readTextFile: (path) => readFile(path, 'utf8'),
        readDirectory: readdir
      })
    });

    expect(audit.automations.active_count).toBe(1);
    expect(audit.automations.entries[0]).toMatchObject({
      id: 'co-orchestration-watcher',
      active: true,
      risk: 'degraded',
      target_thread_id: 'thread-1'
    });
    expect(audit.findings.map((finding) => finding.code)).toContain('active_automations_present');
  });

  it('keeps the audit zero-model and reports unknown cross-thread goal inventory without degrading verdict', async () => {
    const audit = await buildQuotaHygieneAudit({
      flags: {},
      dependencies: baseDependencies()
    });

    expect(audit.model_calls).toEqual({
      budget: 0,
      observed: 0,
      enforcement: 'local_read_only_sources'
    });
    expect(audit.goals.cross_thread).toMatchObject({
      status: 'unavailable',
      risk: 'unknown'
    });
    expect(audit.verdict).toBe('healthy');
    expect(audit.findings.map((finding) => finding.code)).not.toContain(
      'cross_thread_goal_inventory_unavailable'
    );
  });

  it('classifies degraded co-status datasets as non-healthy control-host evidence', async () => {
    const audit = await buildQuotaHygieneAudit({
      flags: {},
      dependencies: baseDependencies({
        readCoStatus: async () => ({
          generated_at: '2026-05-17T00:00:00.000Z',
          mode: 'operator_dashboard',
          read_only: true,
          host: 'localhost',
          counts: {
            running: 0,
            retrying: 0,
            issues: 0,
            max_allowed: null
          },
          selected_issue_identifier: null,
          selected: null,
          running: [],
          retrying: [],
          issues: [],
          degraded_read: {
            reason: 'stale endpoint after control-host restart'
          }
        }) as never
      })
    });

    expect(audit.co_status.classification).toBe('stale_endpoint');
    expect(audit.control_host.status).toBe('stale_endpoint');
    expect(audit.findings.map((finding) => finding.code)).toEqual(
      expect.arrayContaining(['co_status_stale_endpoint', 'control_host_stale_endpoint'])
    );
  });

  it('does not let provider-intake selected_claim projection corroborate itself', async () => {
    const audit = await buildQuotaHygieneAudit({
      flags: { 'provider-intake-state': '/provider/provider-intake-state.json' },
      dependencies: baseDependencies({
        readTextFile: async (path) => {
          if (path === '/provider/provider-intake-state.json') {
            return JSON.stringify(providerIntakeState({
              state: 'running',
              issueIdentifier: 'CO-610',
              taskId: 'linear-co610'
            }));
          }
          return defaultProviderState();
        },
        readCoStatus: async () => ({
          generated_at: '2026-05-17T00:00:00.000Z',
          mode: 'operator_dashboard',
          read_only: true,
          host: 'localhost',
          counts: {
            running: 0,
            retrying: 0,
            issues: 1,
            max_allowed: null
          },
          selected_issue_identifier: 'CO-610',
          selected: {
            issue_id: 'issue-1',
            issue_identifier: 'CO-610',
            task_id: 'linear-co610',
            run_id: 'run-1'
          },
          running: [],
          retrying: [],
          issues: [
            {
              issue_id: 'issue-1',
              issue_identifier: 'CO-610',
              task_id: 'linear-co610',
              run_id: 'run-1'
            }
          ],
          provider_intake: {
            active_claim_count: 1,
            selected_claim: {
              issue_id: 'issue-1',
              issue_identifier: 'CO-610',
              task_id: 'linear-co610',
              run_id: 'run-1'
            }
          }
        }) as never
      })
    });

    expect(audit.co_status.live_tokens).toEqual([]);
    expect(audit.provider_intake.claims[0]).toMatchObject({
      issue_identifier: 'CO-610',
      classification: 'stale_unconfirmed',
      corroboration: {
        process_pids: [],
        co_status_tokens: []
      }
    });
  });

  it('marks providerLinearWorkerRunner processes as quota-burning live provider work', async () => {
    const audit = await buildQuotaHygieneAudit({
      flags: { 'provider-intake-state': '/provider/provider-intake-state.json' },
      dependencies: baseDependencies({
        readProcessInventory: async () => [
          {
            pid: 620,
            ppid: 1,
            lstart: 'Sun May 17 14:01:17 2026',
            etime: '00:10',
            stat: 'S',
            command:
              'node /repo/dist/cli/providerLinearWorkerRunner.js --task linear-co620 --issue CO-620'
          }
        ],
        readTextFile: async (path) => {
          if (path === '/provider/provider-intake-state.json') {
            return JSON.stringify(providerIntakeState({
              state: 'running',
              issueIdentifier: 'CO-620',
              taskId: 'linear-co620'
            }));
          }
          return defaultProviderState();
        }
      })
    });

    expect(audit.process_inventory.processes[0]).toMatchObject({
      pid: 620,
      relevant: true,
      quota_burning: true
    });
    expect(audit.provider_intake.claims[0]).toMatchObject({
      issue_identifier: 'CO-620',
      classification: 'live_process',
      corroboration: {
        process_pids: [620],
        co_status_tokens: []
      }
    });
  });

  it('reuses provider-intake active semantics for retry and handoff states', async () => {
    const audit = await buildQuotaHygieneAudit({
      flags: { 'provider-intake-state': '/provider/provider-intake-state.json' },
      dependencies: baseDependencies({
        readTextFile: async (path) => {
          if (path === '/provider/provider-intake-state.json') {
            return JSON.stringify({
              schema_version: 1,
              updated_at: '2026-05-17T00:00:00.000Z',
              rehydrated_at: null,
              latest_provider_key: null,
              latest_reason: null,
              claims: [
                providerIntakeClaim({
                  state: 'handoff_failed',
                  issueIdentifier: 'CO-630',
                  taskId: 'linear-co630'
                }),
                providerIntakeClaim({
                  state: 'released',
                  issueIdentifier: 'CO-631',
                  taskId: 'linear-co631',
                  retryQueued: true
                }),
                providerIntakeClaim({
                  state: 'running',
                  issueIdentifier: 'CO-632',
                  taskId: 'linear-co632',
                  issueStateType: 'completed'
                })
              ]
            });
          }
          return defaultProviderState();
        }
      })
    });

    expect(audit.provider_intake.active_like_count).toBe(2);
    expect(audit.provider_intake.claims).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          issue_identifier: 'CO-630',
          active_like: true,
          classification: 'stale_unconfirmed'
        }),
        expect.objectContaining({
          issue_identifier: 'CO-631',
          active_like: true,
          classification: 'stale_unconfirmed'
        }),
        expect.objectContaining({
          issue_identifier: 'CO-632',
          active_like: false,
          classification: 'not_active'
        })
      ])
    );
  });

  it('keeps uppercase Codex app processes in the process inventory without marking them quota-burning', async () => {
    const audit = await buildQuotaHygieneAudit({
      flags: {},
      dependencies: baseDependencies({
        readProcessInventory: async () => [
          {
            pid: 123,
            ppid: 1,
            lstart: 'Sun May 17 14:01:17 2026',
            etime: '00:10',
            stat: 'S',
            command: '/Applications/Codex.app/Contents/MacOS/Codex'
          }
        ]
      })
    });

    expect(audit.process_inventory.processes).toHaveLength(1);
    expect(audit.process_inventory.processes[0]).toMatchObject({
      pid: 123,
      quota_burning: false
    });
  });

  it('parses ps inventory lines with lstart and command text', () => {
    const records = parseProcessInventory(
      '123 1 Sun May 17 14:01:17 2026 00:10 S+ codex exec --task linear-abc "work"'
    );

    expect(records).toEqual([
      {
        pid: 123,
        ppid: 1,
        lstart: 'Sun May 17 14:01:17 2026',
        etime: '00:10',
        stat: 'S+',
        command: 'codex exec --task linear-abc "work"'
      }
    ]);
  });
});

function baseDependencies(
  overrides: Partial<Parameters<typeof buildQuotaHygieneAudit>[0]['dependencies']> = {}
): NonNullable<Parameters<typeof buildQuotaHygieneAudit>[0]['dependencies']> {
  return {
    now: () => new Date('2026-05-17T00:00:00.000Z'),
    getCwd: () => '/repo',
    env: {
      CODEX_HOME: '/codex-home'
    } as NodeJS.ProcessEnv,
    log: () => undefined,
    readProcessInventory: async () => [] satisfies QuotaHygieneProcessRecord[],
    inspectDelegateServerProcesses: () => ({
      status: 'ok',
      activeCount: 0,
      staleCount: 0,
      activePids: [],
      stalePids: [],
      staleRssKb: 0,
      thresholdSeconds: 600,
      detail: 'no delegate-server processes',
      details: []
    }),
    readControlHostSupervisionStatus: async () => ({
      installed: true,
      service: {
        loaded: true
      },
      live_host: {
        healthy: true
      }
    }),
    readCoStatus: async () => ({
      generated_at: '2026-05-17T00:00:00.000Z',
      mode: 'operator_dashboard',
      read_only: true,
      host: 'localhost',
      counts: {
        running: 0,
        retrying: 0,
        issues: 0,
        max_allowed: null
      },
      selected_issue_identifier: null,
      selected: null,
      running: [],
      retrying: [],
      issues: []
    }) as never,
    evaluateFreshnessGauge: async () => ({
      version: 1,
      generated_at: '2026-05-17T00:00:00.000Z',
      artifact_root: '/repo/.runs/local-mcp/cli/control-host',
      verdict: 'healthy',
      strict_failed: false,
      findings: [],
      metrics: {}
    }) as never,
    readTextFile: async () => defaultProviderState(),
    readDirectory: async () => [],
    fileExists: existsSync,
    resolveCodexHome: () => '/codex-home',
    ...overrides
  };
}

function defaultProviderState(): string {
  return JSON.stringify(providerIntakeState({ state: 'completed' }));
}

function providerIntakeState(input: {
  state: string;
  issueIdentifier?: string;
  taskId?: string;
}): Record<string, unknown> {
  return {
    schema_version: 1,
    updated_at: '2026-05-17T00:00:00.000Z',
    rehydrated_at: null,
    latest_provider_key: null,
    latest_reason: null,
    claims: [providerIntakeClaim(input)]
  };
}

function providerIntakeClaim(input: {
  state: string;
  issueIdentifier?: string;
  taskId?: string;
  reason?: string | null;
  retryQueued?: boolean | null;
  issueStateType?: string;
}): Record<string, unknown> {
  const issueIdentifier = input.issueIdentifier ?? 'CO-1';
  return {
    provider: 'linear',
    provider_key: 'linear:issue-1',
    issue_id: 'issue-1',
    issue_identifier: issueIdentifier,
    issue_title: 'quota hygiene test',
    issue_state: 'In Progress',
    issue_state_type: input.issueStateType ?? 'started',
    issue_updated_at: '2026-05-17T00:00:00.000Z',
    task_id: input.taskId ?? 'linear-issue-1',
    mapping_source: 'provider_id_fallback',
    state: input.state,
    reason: input.reason ?? null,
    accepted_at: '2026-05-17T00:00:00.000Z',
    updated_at: '2026-05-17T00:00:00.000Z',
    last_delivery_id: null,
    last_event: null,
    last_action: null,
    last_webhook_timestamp: null,
    run_id: 'run-1',
    run_manifest_path: null,
    launch_source: 'control-host',
    launch_token: null,
    retry_queued: input.retryQueued ?? null
  };
}
