import { existsSync } from 'node:fs';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  buildQuotaHygieneAudit,
  formatQuotaHygieneHelp,
  parseProcessInventory,
  runHygieneCliShell,
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

  it('does not let unrelated quota processes activate app-managed delegate-server inventory', async () => {
    const audit = await buildQuotaHygieneAudit({
      flags: {},
      dependencies: baseDependencies({
        readProcessInventory: async () => [
          {
            pid: 900,
            ppid: 1,
            lstart: 'Sun May 17 14:01:17 2026',
            etime: '00:10',
            stat: 'S',
            command: 'codex review --task linear-co900 CO-900'
          }
        ],
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

  it('treats a missing automations directory as an empty inventory', async () => {
    const audit = await buildQuotaHygieneAudit({
      flags: { 'automations-dir': '/codex-home/automations' },
      dependencies: baseDependencies({
        readDirectory: async () => {
          const error = new Error('missing automations directory') as NodeJS.ErrnoException;
          error.code = 'ENOENT';
          throw error;
        }
      })
    });

    expect(audit.automations).toMatchObject({
      status: 'available',
      active_count: 0,
      risk: 'green',
      entries: [],
      error: null
    });
    expect(audit.findings.map((finding) => finding.code)).not.toContain(
      'automation_inventory_unavailable'
    );
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

  it('preserves ui request timeout degraded machine status as available partial status', async () => {
    const audit = await buildQuotaHygieneAudit({
      flags: {},
      dependencies: baseDependencies({
        readCoStatus: async () => ({
          generated_at: '2026-05-17T00:00:00.000Z',
          mode: 'control_machine_status',
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
          provider_intake: {
            active_claim_count: 0,
            running_claim_count: 0
          },
          degraded_read: {
            reason: 'ui_request_timeout',
            source: 'local_machine_status',
            freshness_verdict: 'healthy',
            artifact_root: '/repo/.runs/local-mcp/cli/control-host',
            finding_codes: []
          }
        }) as never
      })
    });

    expect(audit.verdict).toBe('degraded');
    expect(audit.process_inventory.quota_burning_count).toBe(0);
    expect(audit.process_inventory.unowned_quota_burning_count).toBe(0);
    expect(audit.co_status).toMatchObject({
      status: 'available',
      classification: 'degraded_machine_status',
      risk: 'degraded',
      degraded_read_reason: 'ui_request_timeout',
      degraded_read_source: 'local_machine_status',
      degraded_read_freshness_verdict: 'healthy',
      running_count: 0,
      retrying_count: 0,
      active_provider_claim_count: 0,
      live_tokens: []
    });
    expect(audit.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'co_status_degraded_machine_status',
          summary:
            'co-status returned available degraded machine status from local_machine_status (reason: ui_request_timeout, freshness: healthy).',
          evidence: expect.objectContaining({
            degraded_read_reason: 'ui_request_timeout',
            degraded_read_source: 'local_machine_status',
            degraded_read_freshness_verdict: 'healthy'
          })
        })
      ])
    );
    expect(audit.findings.map((finding) => finding.code)).not.toContain('co_status_unavailable');
  });

  it('reports unavailable process inventory instead of aborting the audit', async () => {
    const audit = await buildQuotaHygieneAudit({
      flags: {},
      dependencies: baseDependencies({
        readProcessInventory: async () => {
          throw new Error('ps access denied');
        }
      })
    });

    expect(audit.verdict).toBe('degraded');
    expect(audit.process_inventory).toMatchObject({
      status: 'unavailable',
      total_relevant: 0,
      quota_burning_count: 0,
      unowned_quota_burning_count: 0,
      error: 'ps access denied'
    });
    expect(audit.findings.map((finding) => finding.code)).toContain(
      'process_inventory_unavailable'
    );
  });

  it('honors CODEX_ORCHESTRATOR_RUNS_DIR when resolving default control-host artifacts', async () => {
    const readCoStatusCalls: string[] = [];
    const audit = await buildQuotaHygieneAudit({
      flags: {},
      dependencies: baseDependencies({
        env: {
          CODEX_HOME: '/codex-home',
          CODEX_ORCHESTRATOR_RUNS_DIR: '/shared-runs'
        } as NodeJS.ProcessEnv,
        readCoStatus: async ({ artifactRoot }) => {
          readCoStatusCalls.push(artifactRoot);
          return {
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
          } as never;
        }
      })
    });

    expect(readCoStatusCalls).toEqual(['/shared-runs/local-mcp/cli/control-host']);
    expect(audit.co_status.status).toBe('available');
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

  it('does not let degraded co-status running overlays corroborate provider-intake claims', async () => {
    const audit = await buildQuotaHygieneAudit({
      flags: { 'provider-intake-state': '/provider/provider-intake-state.json' },
      dependencies: baseDependencies({
        readTextFile: async (path) => {
          if (path === '/provider/provider-intake-state.json') {
            return JSON.stringify(providerIntakeState({
              state: 'running',
              issueIdentifier: 'CO-611',
              taskId: 'linear-co611'
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
            running: 1,
            retrying: 0,
            issues: 0,
            max_allowed: null
          },
          selected_issue_identifier: null,
          selected: null,
          running: [
            {
              issue_id: 'issue-1',
              issue_identifier: 'CO-611',
              task_id: 'linear-co611',
              run_id: 'run-1'
            }
          ],
          retrying: [],
          issues: [],
          degraded_read: {
            reason: 'stale endpoint after control-host restart'
          }
        }) as never
      })
    });

    expect(audit.co_status.live_tokens).toEqual([]);
    expect(audit.provider_intake.claims[0]).toMatchObject({
      issue_identifier: 'CO-611',
      classification: 'stale_unconfirmed',
      corroboration: {
        process_pids: [],
        co_status_tokens: []
      }
    });
  });

  it('ignores terminal provider worker proofs as live co-status tokens', async () => {
    const audit = await buildQuotaHygieneAudit({
      flags: { 'provider-intake-state': '/provider/provider-intake-state.json' },
      dependencies: baseDependencies({
        readTextFile: async (path) => {
          if (path === '/provider/provider-intake-state.json') {
            return JSON.stringify(providerIntakeState({
              state: 'running',
              issueIdentifier: 'CO-612',
              taskId: 'linear-co612'
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
          selected_issue_identifier: null,
          selected: null,
          running: [],
          retrying: [],
          issues: [
            {
              issue_id: 'issue-1',
              issue_identifier: 'CO-612',
              task_id: 'linear-co612',
              run_id: 'run-1',
              provider_linear_worker_proof: {
                issue_id: 'issue-1',
                issue_identifier: 'CO-612',
                task_id: 'linear-co612',
                run_id: 'run-1',
                owner_phase: 'ended',
                owner_status: 'succeeded'
              }
            }
          ]
        }) as never
      })
    });

    expect(audit.co_status.live_tokens).toEqual([]);
    expect(audit.provider_intake.claims[0]).toMatchObject({
      issue_identifier: 'CO-612',
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

  it('does not mark bare providerLinearWorkerRunner commands as unowned quota work', async () => {
    const audit = await buildQuotaHygieneAudit({
      flags: {},
      dependencies: baseDependencies({
        readProcessInventory: async () => [
          {
            pid: 621,
            ppid: 1,
            lstart: 'Sun May 17 14:01:17 2026',
            etime: '00:10',
            stat: 'S',
            command: 'node /repo/dist/cli/providerLinearWorkerRunner.js'
          }
        ]
      })
    });

    expect(audit.process_inventory.processes[0]).toMatchObject({
      pid: 621,
      relevant: true,
      quota_burning: false,
      owner: {
        status: 'missing'
      }
    });
    expect(audit.process_inventory.unowned_quota_burning_count).toBe(0);
    expect(audit.findings.map((finding) => finding.code)).not.toContain(
      'unowned_quota_burning_process'
    );
  });

  it('does not count codex-orchestrator exec wrappers as model quota work', async () => {
    const audit = await buildQuotaHygieneAudit({
      flags: {},
      dependencies: baseDependencies({
        readProcessInventory: async () => [
          {
            pid: 650,
            ppid: 1,
            lstart: 'Sun May 17 14:01:17 2026',
            etime: '00:10',
            stat: 'S',
            command: 'node /repo/bin/codex-orchestrator.js exec -- npm test -- QuotaHygieneCliShell.test.ts'
          },
          {
            pid: 651,
            ppid: 1,
            lstart: 'Sun May 17 14:01:17 2026',
            etime: '00:11',
            stat: 'S',
            command: 'node /repo/bin/codex-orchestrator.js review --task linear-co651 CO-651'
          }
        ]
      })
    });

    expect(audit.process_inventory.processes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          pid: 650,
          quota_burning: false
        }),
        expect.objectContaining({
          pid: 651,
          quota_burning: true
        })
      ])
    );
    expect(audit.process_inventory.unowned_quota_burning_count).toBe(0);
  });

  it('recognizes the codex-orch review alias as quota-burning review work', async () => {
    const audit = await buildQuotaHygieneAudit({
      flags: {},
      dependencies: baseDependencies({
        readProcessInventory: async () => [
          {
            pid: 653,
            ppid: 1,
            lstart: 'Sun May 17 14:01:17 2026',
            etime: '00:10',
            stat: 'S',
            command: 'node /repo/bin/codex-orch review --task linear-co653 CO-653'
          }
        ]
      })
    });

    expect(audit.process_inventory.processes[0]).toMatchObject({
      pid: 653,
      quota_burning: true,
      owner: {
        status: 'identified',
        issue_identifier: 'CO-653',
        task_id: 'linear-co653'
      }
    });
  });

  it('does not count control-host provider-worker pipeline configuration as model quota work', async () => {
    const audit = await buildQuotaHygieneAudit({
      flags: {},
      dependencies: baseDependencies({
        readProcessInventory: async () => [
          {
            pid: 652,
            ppid: 1,
            lstart: 'Sun May 17 14:01:17 2026',
            etime: '00:10',
            stat: 'S',
            command:
              'node /repo/bin/codex-orchestrator.js control-host --task local-mcp --run control-host --pipeline provider-linear-worker --format json'
          }
        ]
      })
    });

    expect(audit.process_inventory.processes[0]).toMatchObject({
      pid: 652,
      quota_burning: false,
      owner: {
        status: 'identified',
        task_id: 'local-mcp',
        run_id: 'control-host'
      }
    });
    expect(audit.process_inventory.quota_burning_count).toBe(0);
  });

  it('requires exact process-owner token matches for provider claim corroboration', async () => {
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
            command: 'codex exec --task linear-co620 --issue CO-620'
          }
        ],
        readTextFile: async (path) => {
          if (path === '/provider/provider-intake-state.json') {
            return JSON.stringify(providerIntakeState({
              state: 'running',
              issueIdentifier: 'CO-6',
              taskId: 'linear-co6'
            }));
          }
          return defaultProviderState();
        }
      })
    });

    expect(audit.process_inventory.quota_burning_count).toBe(1);
    expect(audit.provider_intake.claims[0]).toMatchObject({
      issue_identifier: 'CO-6',
      classification: 'stale_unconfirmed',
      corroboration: {
        process_pids: [],
        co_status_tokens: []
      }
    });
  });

  it('does not accept unrelated bare UUIDs as issue owner evidence', async () => {
    const audit = await buildQuotaHygieneAudit({
      flags: {},
      dependencies: baseDependencies({
        readProcessInventory: async () => [
          {
            pid: 654,
            ppid: 1,
            lstart: 'Sun May 17 14:01:17 2026',
            etime: '00:10',
            stat: 'S',
            command: 'codex exec "investigate c093b71f-c6bd-423a-a6ec-3ee3436d6b53 in logs"'
          }
        ]
      })
    });

    expect(audit.process_inventory.processes[0]).toMatchObject({
      pid: 654,
      quota_burning: true,
      owner: {
        status: 'missing',
        issue_id: null
      }
    });
    expect(audit.process_inventory.unowned_quota_burning_count).toBe(1);
    expect(audit.findings.map((finding) => finding.code)).toContain(
      'unowned_quota_burning_process'
    );
  });

  it('recognizes Codex global options before quota-burning subcommands', async () => {
    const audit = await buildQuotaHygieneAudit({
      flags: { 'provider-intake-state': '/provider/provider-intake-state.json' },
      dependencies: baseDependencies({
        readProcessInventory: async () => [
          {
            pid: 640,
            ppid: 1,
            lstart: 'Sun May 17 14:01:17 2026',
            etime: '00:10',
            stat: 'S',
            command: 'codex -m gpt-5.5 exec --task linear-co640 --issue CO-640'
          },
          {
            pid: 641,
            ppid: 1,
            lstart: 'Sun May 17 14:01:17 2026',
            etime: '00:11',
            stat: 'S',
            command: 'codex --profile review review --task linear-co641 --issue CO-641'
          }
        ],
        readTextFile: async (path) => {
          if (path === '/provider/provider-intake-state.json') {
            return JSON.stringify(providerIntakeState({
              state: 'running',
              issueIdentifier: 'CO-640',
              taskId: 'linear-co640'
            }));
          }
          return defaultProviderState();
        }
      })
    });

    expect(audit.process_inventory.processes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          pid: 640,
          quota_burning: true
        }),
        expect.objectContaining({
          pid: 641,
          quota_burning: true
        })
      ])
    );
    expect(audit.provider_intake.claims[0]).toMatchObject({
      issue_identifier: 'CO-640',
      classification: 'live_process',
      corroboration: {
        process_pids: [640],
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

  it('plans stale GitHub polling remediation without default mutation', async () => {
    const audit = await buildQuotaHygieneAudit({
      flags: { only: 'stale-github-polling' },
      dependencies: baseDependencies({
        readProcessInventory: async () => [
          {
            pid: 824,
            ppid: 100,
            lstart: 'Sun May 17 14:01:17 2026',
            etime: '00:20:00',
            stat: 'S',
            command: 'gh pr view 824 --json mergeStateStatus'
          }
        ]
      })
    });

    expect(audit.read_only).toBe(true);
    expect(audit.mutation_mode).toBe('disabled');
    expect(audit.process_inventory.processes[0]).toMatchObject({
      pid: 824,
      quota_burning: false
    });
    expect(audit.process_inventory.unowned_quota_burning_count).toBe(0);
    expect(audit.findings.map((finding) => finding.code)).not.toContain(
      'unowned_quota_burning_process'
    );
    expect(audit.model_calls.observed).toBe(0);
    expect(audit.remediation).toMatchObject({
      requested: true,
      apply_requested: false,
      only: 'stale-github-polling',
      mode: 'dry_run',
      status_counts: {
        remediation_eligible: 1
      }
    });
    expect(audit.remediation.actions[0]).toMatchObject({
      pid: 824,
      target_kind: 'stale-github-polling',
      status: 'remediation_eligible',
      outcome: 'dry_run',
      evidence: {
        command: 'gh pr view 824 --json mergeStateStatus',
        parent_pid: 100,
        age_seconds: 1200,
        stale_threshold_seconds: 600
      }
    });
  });

  it('does not classify command text that only mentions gh pr view as GitHub polling remediation', async () => {
    const audit = await buildQuotaHygieneAudit({
      flags: { only: 'stale-github-polling' },
      dependencies: baseDependencies({
        readProcessInventory: async () => [
          {
            pid: 824,
            ppid: 100,
            lstart: 'Sun May 17 14:01:17 2026',
            etime: '00:20:00',
            stat: 'S',
            command: 'node /repo/worker.js --prompt "please inspect gh pr view 824 --json mergeStateStatus"'
          }
        ]
      })
    });

    expect(audit.process_inventory.processes[0]).toMatchObject({
      pid: 824,
      quota_burning: false
    });
    expect(audit.remediation).toMatchObject({
      requested: true,
      mode: 'dry_run',
      status_counts: {
        detectable_only: 1
      }
    });
    expect(audit.remediation.actions[0]).toMatchObject({
      pid: 824,
      target_kind: 'detectable-only',
      status: 'detectable_only',
      outcome: 'not_requested',
      evidence: {
        classification: 'process_inventory'
      }
    });
  });

  it('requires --yes and scoped --only before applying remediation', async () => {
    const signaled: number[] = [];
    const artifactWrites: string[] = [];
    const audit = await buildQuotaHygieneAudit({
      flags: { apply: true },
      dependencies: baseDependencies({
        readProcessInventory: async () => [
          {
            pid: 824,
            ppid: 100,
            lstart: 'Sun May 17 14:01:17 2026',
            etime: '00:20:00',
            stat: 'S',
            command: 'gh pr view 824 --json mergeStateStatus'
          }
        ],
        signalProcess: (pid) => {
          signaled.push(pid);
          return { status: 'signaled', error: null };
        },
        writeTextFile: (path) => {
          artifactWrites.push(path);
          return Promise.resolve();
        }
      })
    });

    expect(signaled).toEqual([]);
    expect(artifactWrites).toEqual([]);
    expect(audit.read_only).toBe(true);
    expect(audit.mutation_mode).toBe('disabled');
    expect(audit.remediation).toMatchObject({
      apply_requested: true,
      operator_confirmed: false,
      only: null,
      mode: 'operator_confirm_required',
      audit_artifact_path: null,
      status_counts: {
        operator_confirm_required: 1
      }
    });
    expect(audit.remediation.actions[0]).toMatchObject({
      status: 'operator_confirm_required',
      outcome: 'confirmation_required'
    });
  });

  it('requires explicit PID selection before applying remediation', async () => {
    const signaled: number[] = [];
    const audit = await buildQuotaHygieneAudit({
      flags: {
        apply: true,
        yes: true,
        only: 'stale-github-polling'
      },
      dependencies: baseDependencies({
        readProcessInventory: async () => [
          {
            pid: 824,
            ppid: 100,
            lstart: 'Sun May 17 14:01:17 2026',
            etime: '00:20:00',
            stat: 'S',
            command: 'gh pr view 824 --json mergeStateStatus'
          }
        ],
        signalProcess: (pid) => {
          signaled.push(pid);
          return { status: 'signaled', error: null };
        }
      })
    });

    expect(signaled).toEqual([]);
    expect(audit.read_only).toBe(true);
    expect(audit.mutation_mode).toBe('disabled');
    expect(audit.remediation).toMatchObject({
      apply_requested: true,
      operator_confirmed: true,
      only: 'stale-github-polling',
      mode: 'operator_confirm_required',
      audit_artifact_path: null,
      status_counts: {
        operator_confirm_required: 1
      }
    });
    expect(audit.remediation.actions[0]).toMatchObject({
      pid: 824,
      status: 'operator_confirm_required',
      outcome: 'confirmation_required',
      reason: 'remediation requires explicit --pid/--pids target selection'
    });
  });

  it('treats --dry-run as a mutation veto when combined with --apply', async () => {
    const signaled: number[] = [];
    const audit = await buildQuotaHygieneAudit({
      flags: {
        apply: true,
        yes: true,
        only: 'stale-github-polling',
        pids: '824',
        'dry-run': true
      },
      dependencies: baseDependencies({
        readProcessInventory: async () => [
          {
            pid: 824,
            ppid: 100,
            lstart: 'Sun May 17 14:01:17 2026',
            etime: '00:20:00',
            stat: 'S',
            command: 'gh pr view 824 --json mergeStateStatus'
          }
        ],
        signalProcess: (pid) => {
          signaled.push(pid);
          return { status: 'signaled', error: null };
        }
      })
    });

    expect(signaled).toEqual([]);
    expect(audit.read_only).toBe(true);
    expect(audit.mutation_mode).toBe('disabled');
    expect(audit.remediation).toMatchObject({
      apply_requested: true,
      operator_confirmed: true,
      only: 'stale-github-polling',
      mode: 'dry_run',
      audit_artifact_path: null
    });
    expect(audit.remediation.actions[0]).toMatchObject({
      pid: 824,
      status: 'remediation_eligible',
      outcome: 'dry_run',
      reason: 'current audit classifies this PID as stale GitHub PR polling; dry-run only because --dry-run was provided'
    });
  });

  it('writes explicit remediation output for confirmation-required preflight without process mutation', async () => {
    const root = await mkdtemp(join(tmpdir(), 'quota-hygiene-remediation-preflight-'));
    tempDirs.push(root);
    const artifactPath = join(root, 'preflight.json');

    const audit = await buildQuotaHygieneAudit({
      flags: {
        apply: true,
        yes: true,
        only: 'stale-github-polling',
        'remediation-output': artifactPath
      },
      dependencies: baseDependencies({
        readProcessInventory: async () => [
          {
            pid: 824,
            ppid: 100,
            lstart: 'Sun May 17 14:01:17 2026',
            etime: '00:20:00',
            stat: 'S',
            command: 'gh pr view 824 --json mergeStateStatus'
          }
        ],
        writeTextFile: (path, contents) => writeFile(path, contents, 'utf8'),
        makeDirectory: (path) => mkdir(path, { recursive: true })
      })
    });

    expect(audit.read_only).toBe(false);
    expect(audit.mutation_mode).toBe('audit_artifact_write');
    expect(audit.remediation).toMatchObject({
      mode: 'operator_confirm_required',
      artifact_written: true,
      audit_artifact_path: artifactPath,
      status_counts: {
        operator_confirm_required: 1
      }
    });
    const artifact = JSON.parse(await readFile(artifactPath, 'utf8')) as {
      phase: string;
      actions: Array<Record<string, unknown>>;
    };
    expect(artifact.phase).toBe('final');
    expect(artifact.actions[0]).toMatchObject({
      pid: 824,
      status: 'operator_confirm_required'
    });
  });

  it('prints remediation dry-run status in text output', async () => {
    const log = vi.fn();

    await runHygieneCliShell(
      {
        positionals: ['quota'],
        flags: {
          only: 'stale-github-polling'
        },
        printHelp: vi.fn()
      },
      baseDependencies({
        log,
        readProcessInventory: async () => [
          {
            pid: 824,
            ppid: 100,
            lstart: 'Sun May 17 14:01:17 2026',
            etime: '00:20:00',
            stat: 'S',
            command: 'gh pr view 824 --json mergeStateStatus'
          }
        ]
      })
    );

    const lines = log.mock.calls.map(([line]) => line);
    expect(lines).toEqual(
      expect.arrayContaining([
        '- Remediation: dry_run (eligible=1, terminated=0, signal_sent=0, skipped=0, unsafe_to_kill=0, confirmation_required=0)',
        '  - PID 824 stale-github-polling: remediation_eligible (dry_run) - current audit classifies this PID as stale GitHub PR polling; dry-run only because --apply was not provided'
      ])
    );
  });

  it('applies confirmed stale GitHub polling remediation and writes per-PID artifact JSON', async () => {
    const root = await mkdtemp(join(tmpdir(), 'quota-hygiene-remediation-'));
    tempDirs.push(root);
    const artifactPath = join(root, 'remediation.json');
    const signaled: Array<{ pid: number; signal: NodeJS.Signals }> = [];
    const inventory = [
      {
        pid: 824,
        ppid: 100,
        lstart: 'Sun May 17 14:01:17 2026',
        etime: '00:20:00',
        stat: 'S',
        command: 'gh pr view 824 --json mergeStateStatus'
      }
    ] satisfies QuotaHygieneProcessRecord[];

    const audit = await buildQuotaHygieneAudit({
      flags: {
        apply: true,
        yes: true,
        only: 'stale-github-polling',
        pids: '824',
        'remediation-output': artifactPath
      },
      dependencies: baseDependencies({
        readProcessInventory: async () => inventory,
        signalProcess: (pid, signal) => {
          signaled.push({ pid, signal });
          return { status: 'signaled', error: null };
        },
        writeTextFile: (path, contents) => writeFile(path, contents, 'utf8'),
        makeDirectory: (path) => mkdir(path, { recursive: true })
      })
    });

    expect(signaled).toEqual([{ pid: 824, signal: 'SIGTERM' }]);
    expect(audit.read_only).toBe(false);
    expect(audit.mutation_mode).toBe('operator_confirmed_remediation');
    expect(audit.remediation).toMatchObject({
      mode: 'applied',
      terminated_count: 1,
      audit_artifact_path: artifactPath
    });
    expect(audit.remediation.actions[0]).toMatchObject({
      pid: 824,
      status: 'terminated',
      outcome: 'sigterm_sent',
      signal: 'SIGTERM'
    });

    const artifact = JSON.parse(await readFile(artifactPath, 'utf8')) as {
      actions: Array<Record<string, unknown>>;
    };
    expect(artifact.actions[0]).toMatchObject({
      pid: 824,
      status: 'terminated',
      outcome: 'sigterm_sent'
    });
  });

  it('resolves relative remediation output paths against the configured repo root', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'quota-hygiene-repo-root-'));
    const outsideCwd = await mkdtemp(join(tmpdir(), 'quota-hygiene-outside-cwd-'));
    tempDirs.push(repoRoot, outsideCwd);
    const artifactPath = join(repoRoot, 'out', 'remediation.json');

    const audit = await buildQuotaHygieneAudit({
      flags: {
        repo: repoRoot,
        apply: true,
        yes: true,
        only: 'stale-github-polling',
        pids: '824',
        'remediation-output': 'out/remediation.json'
      },
      dependencies: baseDependencies({
        getCwd: () => outsideCwd,
        readProcessInventory: async () => [
          {
            pid: 824,
            ppid: 100,
            lstart: 'Sun May 17 14:01:17 2026',
            etime: '00:20:00',
            stat: 'S',
            command: 'gh pr view 824 --json mergeStateStatus'
          }
        ],
        signalProcess: () => ({ status: 'signaled', error: null }),
        writeTextFile: (path, contents) => writeFile(path, contents, 'utf8'),
        makeDirectory: (path) => mkdir(path, { recursive: true })
      })
    });

    expect(audit.remediation.audit_artifact_path).toBe(artifactPath);
    await expect(readFile(artifactPath, 'utf8')).resolves.toContain('"pid": 824');
  });

  it('prints confirmed remediation result and artifact path in text output', async () => {
    const root = await mkdtemp(join(tmpdir(), 'quota-hygiene-remediation-text-'));
    tempDirs.push(root);
    const artifactPath = join(root, 'remediation.json');
    const log = vi.fn();

    await runHygieneCliShell(
      {
        positionals: ['quota'],
        flags: {
          apply: true,
          yes: true,
          only: 'stale-github-polling',
          pids: '824',
          'remediation-output': artifactPath
        },
        printHelp: vi.fn()
      },
      baseDependencies({
        log,
        readProcessInventory: async () => [
          {
            pid: 824,
            ppid: 100,
            lstart: 'Sun May 17 14:01:17 2026',
            etime: '00:20:00',
            stat: 'S',
            command: 'gh pr view 824 --json mergeStateStatus'
          }
        ],
        signalProcess: () => ({ status: 'signaled', error: null }),
        writeTextFile: (path, contents) => writeFile(path, contents, 'utf8'),
        makeDirectory: (path) => mkdir(path, { recursive: true })
      })
    );

    const lines = log.mock.calls.map(([line]) => line);
    expect(lines).toEqual(
      expect.arrayContaining([
        '- Remediation: applied (eligible=0, terminated=1, signal_sent=0, skipped=0, unsafe_to_kill=0, confirmation_required=0)',
        `- Remediation artifact: ${artifactPath}`,
        '  - PID 824 stale-github-polling: terminated (sigterm_sent, signal=SIGTERM) - operator-confirmed remediation delivered SIGTERM and verified the PID exited'
      ])
    );
  });

  it('documents required PID selection and dry-run in hygiene help', () => {
    const help = formatQuotaHygieneHelp();

    expect(help).toContain('--apply                         Apply operator-confirmed remediation (requires --yes, --only, and --pid/--pids).');
    expect(help).toContain('--dry-run                       Never mutate even when --apply is present; report eligible remediation only.');
    expect(help).toContain('--pid, --pids <csv>             Required PID selection within the scoped current audit when --apply is used.');
  });

  it('fails closed before signaling when remediation artifact output cannot be prepared', async () => {
    const signaled: number[] = [];
    const audit = await buildQuotaHygieneAudit({
      flags: {
        apply: true,
        yes: true,
        only: 'stale-github-polling',
        pids: '824'
      },
      dependencies: baseDependencies({
        readProcessInventory: async () => [
          {
            pid: 824,
            ppid: 100,
            lstart: 'Sun May 17 14:01:17 2026',
            etime: '00:20:00',
            stat: 'S',
            command: 'gh pr view 824 --json mergeStateStatus'
          }
        ],
        signalProcess: (pid) => {
          signaled.push(pid);
          return { status: 'signaled', error: null };
        },
        writeTextFile: async () => {
          throw new Error('remediation artifact unwritable');
        }
      })
    });

    expect(signaled).toEqual([]);
    expect(audit.read_only).toBe(true);
    expect(audit.mutation_mode).toBe('disabled');
    expect(audit.remediation).toMatchObject({
      mode: 'artifact_unavailable',
      artifact_error: 'remediation artifact unwritable',
      status_counts: {
        unsafe_to_kill: 1
      }
    });
    expect(audit.remediation.actions[0]).toMatchObject({
      pid: 824,
      status: 'unsafe_to_kill',
      outcome: 'unsafe_to_kill'
    });
  });

  it('clears the final artifact pointer when post-signal artifact writing fails', async () => {
    const root = await mkdtemp(join(tmpdir(), 'quota-hygiene-remediation-final-fail-'));
    tempDirs.push(root);
    const artifactPath = join(root, 'remediation.json');
    const writes: string[] = [];
    const signaled: number[] = [];

    const audit = await buildQuotaHygieneAudit({
      flags: {
        apply: true,
        yes: true,
        only: 'stale-github-polling',
        pids: '824',
        'remediation-output': artifactPath
      },
      dependencies: baseDependencies({
        readProcessInventory: async () => [
          {
            pid: 824,
            ppid: 100,
            lstart: 'Sun May 17 14:01:17 2026',
            etime: '00:20:00',
            stat: 'S',
            command: 'gh pr view 824 --json mergeStateStatus'
          }
        ],
        signalProcess: (pid) => {
          signaled.push(pid);
          return { status: 'signaled', error: null };
        },
        writeTextFile: async (path, contents) => {
          writes.push(path);
          if (writes.length > 1) {
            throw new Error('final artifact unwritable');
          }
          await writeFile(path, contents, 'utf8');
        },
        makeDirectory: (path) => mkdir(path, { recursive: true })
      })
    });

    expect(signaled).toEqual([824]);
    expect(writes).toEqual([artifactPath, artifactPath]);
    expect(audit.remediation).toMatchObject({
      mode: 'applied',
      artifact_written: true,
      audit_artifact_path: null,
      artifact_error: 'final artifact unwritable',
      terminated_count: 1
    });
  });

  it('refuses requested PIDs that are absent from the current audit', async () => {
    const signaled: number[] = [];
    const audit = await buildQuotaHygieneAudit({
      flags: {
        apply: true,
        yes: true,
        only: 'stale-github-polling',
        pids: '999'
      },
      dependencies: baseDependencies({
        readProcessInventory: async () => [],
        signalProcess: (pid) => {
          signaled.push(pid);
          return { status: 'signaled', error: null };
        }
      })
    });

    expect(signaled).toEqual([]);
    expect(audit.remediation.actions).toEqual([
      expect.objectContaining({
        pid: 999,
        status: 'unsafe_to_kill',
        outcome: 'unsafe_to_kill',
        reason: 'requested PID is not present in the current quota hygiene audit output'
      })
    ]);
  });

  it('refuses process identity changes before signaling a current-audit PID', async () => {
    let readCount = 0;
    const signaled: number[] = [];
    const audit = await buildQuotaHygieneAudit({
      flags: {
        apply: true,
        yes: true,
        only: 'stale-github-polling',
        pids: '824'
      },
      dependencies: baseDependencies({
        readProcessInventory: async () => {
          readCount += 1;
          return [
            {
              pid: 824,
              ppid: 100,
              lstart: 'Sun May 17 14:01:17 2026',
              etime: '00:20:00',
              stat: 'S',
              command:
                readCount === 1
                  ? 'gh pr view 824 --json mergeStateStatus'
                  : 'gh pr view 825 --json mergeStateStatus'
            }
          ];
        },
        signalProcess: (pid) => {
          signaled.push(pid);
          return { status: 'signaled', error: null };
        }
      })
    });

    expect(signaled).toEqual([]);
    expect(audit.read_only).toBe(false);
    expect(audit.mutation_mode).toBe('audit_artifact_write');
    expect(audit.remediation.mode).toBe('no_action');
    expect(audit.remediation.actions[0]).toMatchObject({
      pid: 824,
      status: 'unsafe_to_kill',
      outcome: 'identity_changed'
    });
  });

  it('refuses same-command PID reuse when start time changes before signaling', async () => {
    let readCount = 0;
    const signaled: number[] = [];
    const audit = await buildQuotaHygieneAudit({
      flags: {
        apply: true,
        yes: true,
        only: 'stale-github-polling',
        pids: '824'
      },
      dependencies: baseDependencies({
        readProcessInventory: async () => {
          readCount += 1;
          return [
            {
              pid: 824,
              ppid: 100,
              lstart:
                readCount === 1
                  ? 'Sun May 17 14:01:17 2026'
                  : 'Sun May 17 14:15:17 2026',
              etime: '00:20:00',
              stat: 'S',
              command: 'gh pr view 824 --json mergeStateStatus'
            }
          ];
        },
        signalProcess: (pid) => {
          signaled.push(pid);
          return { status: 'signaled', error: null };
        }
      })
    });

    expect(signaled).toEqual([]);
    expect(audit.remediation.mode).toBe('no_action');
    expect(audit.remediation.actions[0]).toMatchObject({
      pid: 824,
      status: 'unsafe_to_kill',
      outcome: 'identity_changed',
      reason: 'PID start time changed after the current audit, so remediation refused'
    });
  });

  it('refuses a current-audit PID that is no longer stale before signaling', async () => {
    let readCount = 0;
    const signaled: number[] = [];
    const audit = await buildQuotaHygieneAudit({
      flags: {
        apply: true,
        yes: true,
        only: 'stale-github-polling',
        pids: '824'
      },
      dependencies: baseDependencies({
        readProcessInventory: async () => {
          readCount += 1;
          return [
            {
              pid: 824,
              ppid: 100,
              lstart: 'Sun May 17 14:01:17 2026',
              etime: readCount === 1 ? '00:20:00' : '00:01:00',
              stat: 'S',
              command: 'gh pr view 824 --json mergeStateStatus'
            }
          ];
        },
        signalProcess: (pid) => {
          signaled.push(pid);
          return { status: 'signaled', error: null };
        }
      })
    });

    expect(signaled).toEqual([]);
    expect(audit.remediation.mode).toBe('no_action');
    expect(audit.remediation.actions[0]).toMatchObject({
      pid: 824,
      status: 'unsafe_to_kill',
      outcome: 'identity_changed',
      reason: 'PID is no longer stale in the current audit, so remediation refused'
    });
  });

  it('reports signal delivery separately when the PID remains alive after SIGTERM', async () => {
    const signaled: number[] = [];
    const audit = await buildQuotaHygieneAudit({
      flags: {
        apply: true,
        yes: true,
        only: 'stale-github-polling',
        pids: '824'
      },
      dependencies: baseDependencies({
        readProcessInventory: async () => [
          {
            pid: 824,
            ppid: 100,
            lstart: 'Sun May 17 14:01:17 2026',
            etime: '00:20:00',
            stat: 'S',
            command: 'gh pr view 824 --json mergeStateStatus'
          }
        ],
        signalProcess: (pid) => {
          signaled.push(pid);
          return { status: 'signaled', error: null };
        },
        isProcessAlive: () => true
      })
    });

    expect(signaled).toEqual([824]);
    expect(audit.remediation).toMatchObject({
      terminated_count: 0,
      signal_sent_count: 1
    });
    expect(audit.remediation.actions[0]).toMatchObject({
      pid: 824,
      status: 'signal_sent',
      outcome: 'sigterm_sent'
    });
  });

  it('supports stale delegate-server remediation while protecting active app-managed delegates', async () => {
    const signaled: number[] = [];
    const delegateRecords = [
      {
        pid: 700,
        ppid: 100,
        lstart: 'Sun May 17 14:01:17 2026',
        etime: '00:20:00',
        stat: 'S',
        command: 'node /repo/dist/bin/codex-orchestrator.js delegate-server'
      },
      {
        pid: 701,
        ppid: 100,
        lstart: 'Sun May 17 14:01:17 2026',
        etime: '00:01:00',
        stat: 'S',
        command: 'node /repo/dist/bin/codex-orchestrator.js delegate-server'
      }
    ] satisfies QuotaHygieneProcessRecord[];
    const audit = await buildQuotaHygieneAudit({
      flags: {
        apply: true,
        yes: true,
        only: 'stale-delegate-server',
        pids: '700'
      },
      dependencies: baseDependencies({
        readProcessInventory: async () => delegateRecords,
        inspectDelegateServerProcesses: () => ({
          status: 'stale',
          activeCount: 1,
          staleCount: 1,
          activePids: [701],
          stalePids: [700],
          staleRssKb: 4096,
          thresholdSeconds: 600,
          detail: 'one stale delegate-server process',
          details: [
            {
              pid: 700,
              ppid: 100,
              elapsedSeconds: 1200,
              rssKb: 4096,
              command: 'node /repo/dist/bin/codex-orchestrator.js delegate-server',
              cwd: '/repo',
              parentPid: 100,
              parentCommand: 'node /opt/homebrew/bin/codex exec',
              parentCwd: '/repo',
              rootCodexParentPid: 100,
              rootCodexParentCommand: 'node /opt/homebrew/bin/codex exec',
              rootCodexParentCwd: '/repo',
              manifestAssociation: {
                manifestPath: '/repo/.runs/linear-co551/run/manifest.json',
                workspacePath: '/repo',
                status: 'succeeded',
                pipelineId: 'provider-linear-worker',
                taskId: 'linear-co551',
                runId: 'run-1',
                issueId: 'issue-1',
                issueIdentifier: 'CO-551',
                proofPid: 700
              },
              classification: 'stale-parent-session',
              classificationDetail: 'parent session is terminal'
            },
            {
              pid: 701,
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
        }),
        signalProcess: (pid) => {
          signaled.push(pid);
          return { status: 'signaled', error: null };
        }
      })
    });

    expect(signaled).toEqual([700]);
    expect(audit.remediation.actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          pid: 700,
          target_kind: 'stale-delegate-server',
          status: 'terminated'
        }),
        expect.objectContaining({
          pid: 701,
          target_kind: 'stale-delegate-server',
          status: 'unsafe_to_kill',
          outcome: 'unsafe_to_kill'
        })
      ])
    );
  });

  it('truthfully refuses selected delegate-server PIDs when delegate inspection is unavailable', async () => {
    const signaled: number[] = [];
    const audit = await buildQuotaHygieneAudit({
      flags: {
        apply: true,
        yes: true,
        only: 'stale-delegate-server',
        pids: '700'
      },
      dependencies: baseDependencies({
        readProcessInventory: async () => [
          {
            pid: 700,
            ppid: 100,
            lstart: 'Sun May 17 14:01:17 2026',
            etime: '00:20:00',
            stat: 'S',
            command: 'node /repo/dist/bin/codex-orchestrator.js delegate-server'
          }
        ],
        inspectDelegateServerProcesses: () => ({
          status: 'unavailable',
          activeCount: 0,
          staleCount: 0,
          activePids: [],
          stalePids: [],
          staleRssKb: 0,
          thresholdSeconds: 600,
          detail: 'delegate inspection failed',
          details: []
        }),
        signalProcess: (pid) => {
          signaled.push(pid);
          return { status: 'signaled', error: null };
        }
      })
    });

    expect(signaled).toEqual([]);
    expect(audit.remediation.actions[0]).toMatchObject({
      pid: 700,
      target_kind: 'stale-delegate-server',
      status: 'unsafe_to_kill',
      outcome: 'identity_revalidation_unavailable',
      reason:
        'delegate-server PID is present in process inventory, but current delegate-server inspection is unavailable, so remediation refused',
      evidence: {
        source: 'process_inventory',
        command: 'node /repo/dist/bin/codex-orchestrator.js delegate-server',
        classification: 'delegate_inspection_unavailable'
      }
    });
  });

  it('refuses stale delegate-server remediation when the current process is no longer stale', async () => {
    let readCount = 0;
    const signaled: number[] = [];
    const audit = await buildQuotaHygieneAudit({
      flags: {
        apply: true,
        yes: true,
        only: 'stale-delegate-server',
        pids: '700'
      },
      dependencies: baseDependencies({
        readProcessInventory: async () => {
          readCount += 1;
          return [
            {
              pid: 700,
              ppid: 100,
              lstart: 'Sun May 17 14:01:17 2026',
              etime: readCount >= 3 ? '00:01:00' : '00:20:00',
              stat: 'S',
              command: 'node /repo/dist/bin/codex-orchestrator.js delegate-server'
            }
          ];
        },
        inspectDelegateServerProcesses: () => ({
          status: 'stale',
          activeCount: 0,
          staleCount: 1,
          activePids: [],
          stalePids: [700],
          staleRssKb: 4096,
          thresholdSeconds: 600,
          detail: 'one stale delegate-server process',
          details: [
            {
              pid: 700,
              ppid: 100,
              elapsedSeconds: 1200,
              rssKb: 4096,
              command: 'node /repo/dist/bin/codex-orchestrator.js delegate-server',
              cwd: '/repo',
              parentPid: 100,
              parentCommand: 'node /opt/homebrew/bin/codex exec',
              parentCwd: '/repo',
              rootCodexParentPid: 100,
              rootCodexParentCommand: 'node /opt/homebrew/bin/codex exec',
              rootCodexParentCwd: '/repo',
              manifestAssociation: null,
              classification: 'stale-parent-session',
              classificationDetail: 'parent session is terminal'
            }
          ]
        }),
        signalProcess: (pid) => {
          signaled.push(pid);
          return { status: 'signaled', error: null };
        }
      })
    });

    expect(signaled).toEqual([]);
    expect(audit.remediation.actions[0]).toMatchObject({
      pid: 700,
      target_kind: 'stale-delegate-server',
      status: 'unsafe_to_kill',
      outcome: 'identity_changed',
      reason: 'PID is no longer stale in the current audit, so remediation refused'
    });
  });

  it('refuses stale delegate-server remediation when current delegate inspection no longer marks it stale', async () => {
    let inspectCount = 0;
    const signaled: number[] = [];
    const audit = await buildQuotaHygieneAudit({
      flags: {
        apply: true,
        yes: true,
        only: 'stale-delegate-server',
        pids: '700'
      },
      dependencies: baseDependencies({
        readProcessInventory: async () => [
          {
            pid: 700,
            ppid: 100,
            lstart: 'Sun May 17 14:01:17 2026',
            etime: '00:20:00',
            stat: 'S',
            command: 'node /repo/dist/bin/codex-orchestrator.js delegate-server'
          }
        ],
        inspectDelegateServerProcesses: () => {
          inspectCount += 1;
          const classification = inspectCount >= 3 ? 'active-associated' : 'stale-parent-session';
          return {
            status: inspectCount >= 3 ? 'ok' : 'stale',
            activeCount: inspectCount >= 3 ? 1 : 0,
            staleCount: inspectCount >= 3 ? 0 : 1,
            activePids: inspectCount >= 3 ? [700] : [],
            stalePids: inspectCount >= 3 ? [] : [700],
            staleRssKb: inspectCount >= 3 ? 0 : 4096,
            thresholdSeconds: 600,
            detail: inspectCount >= 3
              ? 'delegate-server process is now associated with a live session'
              : 'one stale delegate-server process',
            details: [
              {
                pid: 700,
                ppid: 100,
                elapsedSeconds: 1200,
                rssKb: 4096,
                command: 'node /repo/dist/bin/codex-orchestrator.js delegate-server',
                cwd: '/repo',
                parentPid: 100,
                parentCommand: 'node /opt/homebrew/bin/codex exec',
                parentCwd: '/repo',
                rootCodexParentPid: 100,
                rootCodexParentCommand: 'node /opt/homebrew/bin/codex exec',
                rootCodexParentCwd: '/repo',
                manifestAssociation: {
                  manifestPath: '/repo/.runs/linear-co551/run/manifest.json',
                  workspacePath: '/repo',
                  status: inspectCount >= 3 ? 'running' : 'succeeded',
                  pipelineId: 'provider-linear-worker',
                  taskId: 'linear-co551',
                  runId: 'run-1',
                  issueId: 'issue-1',
                  issueIdentifier: 'CO-551',
                  proofPid: 700
                },
                classification,
                classificationDetail: inspectCount >= 3
                  ? 'delegate-server is rooted in a live manifest'
                  : 'parent session is terminal'
              }
            ]
          };
        },
        signalProcess: (pid) => {
          signaled.push(pid);
          return { status: 'signaled', error: null };
        }
      })
    });

    expect(signaled).toEqual([]);
    expect(audit.remediation.actions[0]).toMatchObject({
      pid: 700,
      target_kind: 'stale-delegate-server',
      status: 'unsafe_to_kill',
      outcome: 'identity_changed',
      reason: 'PID is no longer stale in the current delegate-server inspection, so remediation refused'
    });
  });

  it('keeps app-server, control-host, active review, and provider-worker processes out of remediation', async () => {
    const signaled: number[] = [];
    const audit = await buildQuotaHygieneAudit({
      flags: {
        apply: true,
        yes: true,
        only: 'stale-github-polling'
      },
      dependencies: baseDependencies({
        readProcessInventory: async () => [
          {
            pid: 123,
            ppid: 1,
            lstart: 'Sun May 17 14:01:17 2026',
            etime: '00:20:00',
            stat: 'S',
            command: '/Applications/Codex.app/Contents/MacOS/Codex app-server'
          },
          {
            pid: 124,
            ppid: 1,
            lstart: 'Sun May 17 14:01:17 2026',
            etime: '00:20:00',
            stat: 'S',
            command: 'node /repo/bin/codex-orchestrator.js control-host --task local-mcp'
          },
          {
            pid: 125,
            ppid: 1,
            lstart: 'Sun May 17 14:01:17 2026',
            etime: '00:20:00',
            stat: 'S',
            command: 'codex review --task linear-co125 CO-125'
          },
          {
            pid: 126,
            ppid: 1,
            lstart: 'Sun May 17 14:01:17 2026',
            etime: '00:20:00',
            stat: 'S',
            command:
              'node /repo/dist/cli/providerLinearWorkerRunner.js --task linear-co126 --issue CO-126'
          }
        ],
        signalProcess: (pid) => {
          signaled.push(pid);
          return { status: 'signaled', error: null };
        }
      })
    });

    expect(signaled).toEqual([]);
    expect(audit.remediation.actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ pid: 123, status: 'unsafe_to_kill' }),
        expect.objectContaining({ pid: 124, status: 'unsafe_to_kill' }),
        expect.objectContaining({ pid: 125, status: 'detectable_only' }),
        expect.objectContaining({ pid: 126, status: 'detectable_only' })
      ])
    );
  });

  it('rejects kill-by-name style hygiene quota flags', async () => {
    await expect(
      runHygieneCliShell(
        {
          positionals: ['quota'],
          flags: {
            apply: true,
            yes: true,
            only: 'stale-github-polling',
            name: 'gh'
          },
          printHelp: () => undefined
        },
        baseDependencies()
      )
    ).rejects.toThrow('Unknown hygiene quota flag(s): --name');
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
    writeTextFile: async () => undefined,
    makeDirectory: async () => undefined,
    readDirectory: async () => [],
    fileExists: existsSync,
    signalProcess: () => ({ status: 'blocked', error: 'unexpected signalProcess call' }),
    isProcessAlive: () => false,
    waitForMs: async () => undefined,
    getCurrentProcessPid: () => 999_999,
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
