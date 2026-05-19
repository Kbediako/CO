# Task Mirror - CO-542 deterministic quota hygiene audit

- Linear Issue: `CO-542` / `c093b71f-c6bd-423a-a6ec-3ee3436d6b53`
- Task registry id: `linear-c093b71f-c6bd-423a-a6ec-3ee3436d6b53`
- Primary checklist: `tasks/tasks-linear-c093b71f-c6bd-423a-a6ec-3ee3436d6b53.md`
- PRD: `docs/PRD-linear-c093b71f-c6bd-423a-a6ec-3ee3436d6b53.md`
- TECH_SPEC: `tasks/specs/linear-c093b71f-c6bd-423a-a6ec-3ee3436d6b53.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-c093b71f-c6bd-423a-a6ec-3ee3436d6b53.md`
- Source anchor: `ctx:sha256:907f29dadf81e0e1954977486d717302a4460e0f8c6476a75ca1a9b3ed0d49d1#chunk:c000001`

## Current Scope
- Create and implement the CO-542 zero-model deterministic quota hygiene audit.
- Preserve `no default mutations`.
- Preserve `unknown cross-thread goals remain unknown`.
- Require corroboration for app-managed delegate false positives.
- Prevent stale provider-intake claims from counting as live WIP without live evidence.

## Status
- [x] Docs-first packet created in child lane.
- [x] Canonical task registry entry prepared.
- [x] `docs/TASKS.md` snapshot prepared.
- [x] Child lane stayed docs-only; parent owns and completed implementation/test changes.
- [x] Parent accepted/imported patch and recorded workpad evidence.
- [x] Parent implementation and focused validation complete.
- [x] Prior review handoff blocker cleared by live `docs:freshness:maintain` on 2026-05-19: `freshness_decision=pass_with_owned_rolling_debt`, owner `CO-558`, `blocks_handoff=false`.
- [x] Rebased validation passed after current-main recovery.
- [x] PR #842 review rework addressed stale selected-claim corroboration, degraded `co-status` reads, provider runner detection, canonical provider-intake active semantics, and unknown cross-thread goal reporting.
- [ ] PR handoff after branch push and review drain.

## Implementation Evidence
- CLI surface: `codex-orchestrator hygiene quota`.
- Implementation: `orchestrator/src/cli/quotaHygieneCliShell.ts`.
- Tests: `orchestrator/tests/QuotaHygieneCliShell.test.ts`.
- Focused smoke: `codex-orchestrator hygiene quota --format json` reported `model_calls.budget=0`, `observed=0`, `read_only=true`, and `mutation_mode=disabled`.
- Historical validation: build, lint, focused tests, full tests, docs:check, repo:stewardship, diff-budget override, and pack:smoke passed before the CO-522 blocker cleared.
- Current recovery validation: `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run test` (364 files / 5991 tests), `npm run docs:check`, `npm run docs:freshness`, `npm run repo:stewardship`, `node scripts/diff-budget.mjs`, `npm run pack:smoke`, and `codex-orchestrator hygiene quota --format json` passed on latest `origin/main`; review rework focused tests passed 11 quota hygiene cases.

## Fallback Decision Table
- Large-refactor decision: not required for the packet; parent should start with a read-only evidence classifier.
- Minor-seam decision: acceptable because the audit reports evidence and uncertainty without mutating source authority.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Stale provider-intake WIP inference | Cached provider-intake rows can look like active WIP after live state changed. | `remove fallback` | CO-542 | Audit sees provider-intake row without live worker/run/Linear/control-host proof. | Existing provider-intake retained-history behavior | 2026-05-17 | This issue | Audit classifies the row as stale or uncorroborated instead of live WIP. | Focused deterministic fixture for stale provider-intake claim. |
| App-managed delegate visibility | App-managed delegate state can look like repo-local active child/delegate ownership. | `remove fallback` | CO-542 | Delegate row lacks current run/process/manifest or parent corroboration. | Existing app-managed delegate visibility | 2026-05-17 | This issue | Audit reports uncorroborated app-managed delegate evidence and avoids quota-blocker escalation. | Focused deterministic fixture for false-positive delegate signal. |
| Cross-thread goal status | Remote or app-managed thread goal state may be missing or stale. | `justify retaining fallback` | Parent CO supervision | Current authoritative evidence is unavailable. | Existing parent-session supervision behavior | 2026-05-17 | Durable uncertainty contract | A live source or parent-approved artifact proves a concrete status. | Report schema preserves `unknown` and evidence reason. |

- Contract name: quota hygiene deterministic evidence classification.
- Owning surface: parent CO supervision / quota hygiene audit.
- Steady-state proof: report output keeps uncorroborated and unknown states separate from confirmed quota blockers.
- Tests/docs: `orchestrator/tests/QuotaHygieneCliShell.test.ts`, this task mirror, the PRD, TECH_SPEC, ACTION_PLAN, and task checklist preserve the fallback decision evidence.
- Non-expiring rationale: preserving `unknown` for cross-thread goals is a durable safety contract until a stronger live evidence source exists.

## Not Done If
- The audit spends model quota or launches model-backed review as normal execution.
- The audit mutates defaults, model settings, provider caps, queue state, or persisted issue state.
- Unknown cross-thread goals are converted to concrete status without current evidence.
- App-managed delegate false positives are promoted without corroboration.
- Stale provider-intake rows are counted as live WIP without live worker, run, Linear, or control-host proof.
