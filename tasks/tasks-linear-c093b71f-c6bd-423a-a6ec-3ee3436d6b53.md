# Task Checklist - CO-542 deterministic quota hygiene audit

- Linear Issue: `CO-542` / `c093b71f-c6bd-423a-a6ec-3ee3436d6b53`
- Task registry id: `linear-c093b71f-c6bd-423a-a6ec-3ee3436d6b53`
- MCP Task ID: `linear-c093b71f-c6bd-423a-a6ec-3ee3436d6b53`
- PRD: `docs/PRD-linear-c093b71f-c6bd-423a-a6ec-3ee3436d6b53.md`
- TECH_SPEC: `tasks/specs/linear-c093b71f-c6bd-423a-a6ec-3ee3436d6b53.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-c093b71f-c6bd-423a-a6ec-3ee3436d6b53.md`
- Agent task mirror: `.agent/task/linear-c093b71f-c6bd-423a-a6ec-3ee3436d6b53.md`
- Source anchor: `ctx:sha256:907f29dadf81e0e1954977486d717302a4460e0f8c6476a75ca1a9b3ed0d49d1#chunk:c000001`

## Docs-First
- [x] Child-lane scope confirmed docs-only. Evidence: launch prompt limits edits to this packet, `docs/TASKS.md`, `tasks/index.json`, and `.agent/task/linear-c093b71f-c6bd-423a-a6ec-3ee3436d6b53.md`.
- [x] PRD created with protected issue wording, non-goals, Not Done If, and fallback/refactor decisions. Evidence: `docs/PRD-linear-c093b71f-c6bd-423a-a6ec-3ee3436d6b53.md`.
- [x] TECH_SPEC created with deterministic audit requirements and validation plan. Evidence: `tasks/specs/linear-c093b71f-c6bd-423a-a6ec-3ee3436d6b53.md`.
- [x] ACTION_PLAN created for parent implementation sequencing. Evidence: `docs/ACTION_PLAN-linear-c093b71f-c6bd-423a-a6ec-3ee3436d6b53.md`.
- [x] Checklist mirrored to `.agent/task`. Evidence: `.agent/task/linear-c093b71f-c6bd-423a-a6ec-3ee3436d6b53.md`.
- [x] Task registration updated in canonical `tasks/index.json` `items[]` shape. Evidence: `tasks/index.json`.
- [x] `docs/TASKS.md` snapshot entry added. Evidence: `docs/TASKS.md`.
- [x] Parent workpad updated with accepted child-lane patch. Evidence: Linear workpad `d2e7cc71-ea26-4167-bfa8-a75f8df1c527` records docs child-lane acceptance.
- [x] Pre-implementation docs-review or parent-recorded fallback. Evidence: docs-review child-stream reached `docs:freshness:maintain` with owner `CO-522`, no missing registry entries, and no diff-local changed-path blockers.

## Acceptance Criteria
- [x] Audit path runs with zero model calls and no review/model-spend side effects. Evidence: `codex-orchestrator hygiene quota --format json` reports `model_calls.budget=0`, `model_calls.observed=0`, and `enforcement=local_read_only_sources`.
- [x] Audit path is read-only and makes no default mutations. Evidence: `orchestrator/src/cli/quotaHygieneCliShell.ts` emits `read_only: true` and `mutation_mode: disabled`; the implementation reads process/control-host/co-status/provider-intake/automation/goal evidence only.
- [x] Unknown cross-thread goals remain `unknown` unless current evidence proves otherwise. Evidence: `orchestrator/tests/QuotaHygieneCliShell.test.ts` covers unknown cross-thread inventory and the audit reports `goals.cross_thread.risk=unknown`.
- [x] App-managed delegate false positives require corroboration before active quota-blocker classification. Evidence: focused test covers active-unassociated delegate-server as `idle_infrastructure` when no worker/review/provider evidence corroborates active WIP.
- [x] Stale `provider-intake-state.json` claims are not counted as live WIP without live worker, run, Linear, or control-host evidence. Evidence: focused test classifies active-like uncorroborated intake claim as `stale_unconfirmed`.
- [x] Report output is deterministic and includes evidence provenance/classification. Evidence: `orchestrator/src/cli/quotaHygieneCliShell.ts` schema covers process inventory, delegation, control-host, freshness, co-status, provider intake, automations, goals, findings, and escalation policy.

## Protected Issue Terms
- [x] `zero-model deterministic quota hygiene audit`
- [x] `no default mutations`
- [x] `unknown cross-thread goals remain unknown`
- [x] `app-managed delegate false positives require corroboration`
- [x] `stale provider-intake claims are not live WIP without live evidence`
- [x] `provider-intake-state.json`
- [x] `live WIP`
- [x] `co-status`
- [x] `control-host`

## Fallback Decision Table
- Large-refactor decision: not required for the docs packet; parent should add a read-only evidence classifier before considering a provider-intake/status authority refactor.
- Minor-seam decision: acceptable because the audit labels evidence and uncertainty without mutating runtime state or becoming a queue authority.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Stale provider-intake WIP inference | Cached provider-intake rows can look like active WIP after live state changed. | `remove fallback` | CO-542 | Audit sees provider-intake row without live worker/run/Linear/control-host proof. | Existing provider-intake retained-history behavior | 2026-05-17 | This issue | Audit classifies the row as stale or uncorroborated instead of live WIP. | Focused deterministic fixture for stale provider-intake claim. |
| App-managed delegate visibility | App-managed delegate state can look like repo-local active child/delegate ownership. | `remove fallback` | CO-542 | Delegate row lacks current run/process/manifest or parent corroboration. | Existing app-managed delegate visibility | 2026-05-17 | This issue | Audit reports uncorroborated app-managed delegate evidence and avoids quota-blocker escalation. | Focused deterministic fixture for false-positive delegate signal. |
| Cross-thread goal status | Remote or app-managed thread goal state may be missing or stale. | `justify retaining fallback` | Parent CO supervision | Current authoritative evidence is unavailable. | Existing parent-session supervision behavior | 2026-05-17 | Durable uncertainty contract | A live source or parent-approved artifact proves a concrete status. | Report schema preserves `unknown` and evidence reason. |

- Contract name: quota hygiene deterministic evidence classification.
- Owning surface: parent CO supervision / quota hygiene audit.
- Steady-state proof: uncorroborated and unknown states remain distinct from confirmed quota blockers.
- Tests/docs: this packet plus future focused deterministic fixtures.
- Non-expiring rationale: uncertainty preservation is a durable parent-session supervision safety contract.

## Implementation
- [x] Parent identifies deterministic evidence inputs and report schema. Evidence: `buildQuotaHygieneAudit` composes process inventory, delegate-server inspection, control-host supervision, freshness gauge, co-status, provider-intake, automations, and optional current-thread goal manifest evidence.
- [x] Parent implements read-only zero-model audit/report path. Evidence: `codex-orchestrator hygiene quota` in `bin/codex-orchestrator.ts` and `orchestrator/src/cli/quotaHygieneCliShell.ts`.
- [x] Parent adds focused deterministic fixtures. Evidence: `orchestrator/tests/QuotaHygieneCliShell.test.ts` now has 24 deterministic tests for stale intake, app-managed delegates, delegate/quota-process correlation, unloaded launchd, unavailable process inventory, configured runs-root artifact resolution, missing/active automation inventories, zero-model/unknown goals, degraded co-status reads, terminal proof filtering, selected-claim and degraded-running self-corroboration rejection, provider runner process detection, exact provider process-token matching, Codex global-option/alias detection, explicit-owner-only UUID handling, orchestrator exec and control-host provider-pipeline false positives, canonical provider-intake active semantics, uppercase Codex app processes, and `ps` parsing.
- [ ] Parent records workpad evidence and PR summary. Evidence: pending final workpad closeout and PR lifecycle decision.

## Validation
- [x] Scoped child-lane diff hygiene over declared files. Evidence: `git diff --check -- docs/PRD-linear-c093b71f-c6bd-423a-a6ec-3ee3436d6b53.md tasks/specs/linear-c093b71f-c6bd-423a-a6ec-3ee3436d6b53.md docs/ACTION_PLAN-linear-c093b71f-c6bd-423a-a6ec-3ee3436d6b53.md tasks/tasks-linear-c093b71f-c6bd-423a-a6ec-3ee3436d6b53.md docs/TASKS.md tasks/index.json .agent/task/linear-c093b71f-c6bd-423a-a6ec-3ee3436d6b53.md` passed.
- [x] JSON parse for `tasks/index.json`. Evidence: `node -e "JSON.parse(require('node:fs').readFileSync('tasks/index.json','utf8')); console.log('tasks/index.json OK')"` printed `tasks/index.json OK`.
- [x] Protected-term scan. Evidence: `rg -n "zero-model deterministic quota hygiene audit|no default mutations|unknown cross-thread goals remain unknown|app-managed delegate false positives require corroboration|stale provider-intake claims are not live WIP without live evidence" ...` found the protected terms across the packet, mirror, snapshot, and registry entry.
- [x] Parent focused audit fixtures. Evidence: `npm run test -- QuotaHygieneCliShell.test.ts` passed, 24 tests after PR #842 review rework.
- [x] Parent-selected build/lint/test/package gates. Evidence: after current-main recovery and review rework, `npm run build` passed; `npm run lint` passed with 3 pre-existing `DelegationMcpHealth.test.ts` warnings; full `npm run test` passed 364 files / 6004 tests, matching the PR validation summary; `npm run docs:check` passed; `npm run docs:freshness` passed; `npm run repo:stewardship` passed; `npm run pack:smoke` passed.
- [x] Diff budget recorded with explicit justification and recovery rerun. Evidence: earlier `DIFF_BUDGET_OVERRIDE_REASON=... node scripts/diff-budget.mjs` accepted the implementation scope, and the current recovery rerun passed the hard working-tree gate with a non-blocking stacked aggregate advisory.
- [x] Previous review handoff blocker cleared. Evidence: live `npm run docs:freshness:maintain -- --format json` on 2026-05-19 reported `freshness_decision=pass_with_owned_rolling_debt`, owner `CO-558`, and `blocks_handoff=false`.
- [x] Rebased review handoff gate. Evidence: after current-main recovery, `node scripts/spec-guard.mjs --dry-run`, `codex-orchestrator hygiene quota --format json`, `git diff --check`, build, lint, full test, docs gates, repo stewardship, diff budget, and pack smoke passed.
- [ ] PR handoff. Evidence: pending branch push, PR creation, ready-review drain, and final workpad closeout.

## Progress Log
- 2026-05-17: Bounded docs child lane created the CO-542 docs-first packet and registry mirrors only; no implementation, tests, Linear, or GitHub changes.
- 2026-05-17: Parent implemented `codex-orchestrator hygiene quota`, added deterministic fixtures, and validated the code path. Review handoff was blocked by existing `CO-522` docs-freshness owner debt, not by a diff-local registry miss.
- 2026-05-19: Live docs freshness maintenance evidence cleared the handoff blocker under CO-558 (`blocks_handoff=false`), and parent recovered the dirty CO-542 worker output onto latest `origin/main`.
- 2026-05-19: Current-main recovery validation passed through spec guard, build, lint, full tests, docs gates, repo stewardship, diff budget, pack smoke, and live zero-model quota audit smoke; branch is ready for PR handoff.
- 2026-05-19: PR #842 review rework fixed stale selected-claim self-corroboration, degraded `co-status` dataset classification, provider runner process detection, canonical provider-intake active semantics, and unknown cross-thread goal handling; focused and full tests are green.
- 2026-05-19: Current-head Codex review rework fixed degraded `co-status` running-overlay self-corroboration and missing automations directory false degradation; focused quota hygiene tests, build, lint, and full tests are green.
- 2026-05-19: Current-head Codex review rework fixed orchestrator exec false positives, exact provider process-token corroboration, and Codex global-option detection; focused quota hygiene tests are green.
- 2026-05-19: Live quota hygiene smoke exposed and parent fixed control-host `--pipeline provider-linear-worker` false positives so managed control-host infrastructure no longer counts as quota-burning model work.
- 2026-05-19: Current-head Codex review rework fixed `codex-orch review` alias detection, bare UUID owner false positives, terminal provider proof live-token leaks, delegate corroboration scope, provider-runner owner requirements, unavailable process inventory handling, and configured runs-root artifact lookup; focused and full tests are green.

## Notes
- Parent orchestration remains responsible for Linear workpad updates, docs-review classification, implementation, validation, PR lifecycle, and live quota/control-host evidence.
