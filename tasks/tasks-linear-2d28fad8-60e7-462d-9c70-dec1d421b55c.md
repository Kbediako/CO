# Task Checklist - CO-556 auto-restart or fail closed on stale resident code

- Linear Issue: `CO-556` / `2d28fad8-60e7-462d-9c70-dec1d421b55c`
- Task registry id: `20260520-linear-2d28fad8-60e7-462d-9c70-dec1d421b55c`
- MCP Task ID: `linear-2d28fad8-60e7-462d-9c70-dec1d421b55c`
- Primary PRD: `docs/PRD-linear-2d28fad8-60e7-462d-9c70-dec1d421b55c.md`
- TECH_SPEC: `tasks/specs/linear-2d28fad8-60e7-462d-9c70-dec1d421b55c.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-2d28fad8-60e7-462d-9c70-dec1d421b55c.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-2d28fad8-60e7-462d-9c70-dec1d421b55c.md`
- Agent task mirror: `.agent/task/linear-2d28fad8-60e7-462d-9c70-dec1d421b55c.md`
- Canonical owner key: `control-host:stale-resident-code-auto-restart-fail-closed`
- Shared source anchor: `ctx:sha256:ae0909adb0536f00cad4a362edd1e495157b446bb95ab0c17655b489a548065f#chunk:c000001`
- Child manifest: `.runs/linear-2d28fad8-60e7-462d-9c70-dec1d421b55c-docs-packet/cli/2026-05-20T00-20-24-774Z-cc622583/manifest.json`
- Source payload note: source payload was absent under this child checkout's own `.runs` tree and was read read-only from the parent-relative source path; it contained run and issue provenance for CO-556, so this packet preserves the parent-provided issue wording.

## Docs-First
- [x] PRD created with user-request translation, intent checksum, parity matrix, non-goals, Not Done If, acceptance criteria, validation plan, and fallback/refactor decision. Evidence: `docs/PRD-linear-2d28fad8-60e7-462d-9c70-dec1d421b55c.md`.
- [x] Canonical TECH_SPEC created under `tasks/specs/` with issue-shaping contract, readiness gate, technical requirements, acceptance criteria, and validation plan. Evidence: `tasks/specs/linear-2d28fad8-60e7-462d-9c70-dec1d421b55c.md`.
- [x] TECH_SPEC mirror created under `docs/`. Evidence: `docs/TECH_SPEC-linear-2d28fad8-60e7-462d-9c70-dec1d421b55c.md`.
- [x] ACTION_PLAN created with sequencing, dependencies, validation, and risk controls. Evidence: `docs/ACTION_PLAN-linear-2d28fad8-60e7-462d-9c70-dec1d421b55c.md`.
- [x] Task checklist created. Evidence: `tasks/tasks-linear-2d28fad8-60e7-462d-9c70-dec1d421b55c.md`.
- [x] Task registration updated in canonical `tasks/index.json` `items[]` shape. Evidence: `tasks/index.json`.
- [x] Task snapshot updated. Evidence: `docs/TASKS.md`.
- [x] Docs freshness registry updated for declared packet/checklist/mirror files. Evidence: `docs/docs-freshness-registry.json`.
- [x] `.agent/task` mirror created. Evidence: `.agent/task/linear-2d28fad8-60e7-462d-9c70-dec1d421b55c.md`.

## Protected Issue Terms
- [x] `supervised control-host source freshness`
- [x] `control-host-owner.json`
- [x] `source_root_freshness`
- [x] stale resident code
- [x] `origin/main`
- [x] `provider-intake-state.json`
- [x] `co-status --format json`
- [x] terminal Linear truth
- [x] active WIP
- [x] auto-restart
- [x] fail closed
- [x] CO-515 stale-source recompute/invalidation
- [x] CO-555 terminal-claim precedence
- [x] CO-458
- [x] CO-552 drift invariants

## Wrong Interpretations Rejected
- [x] blindly restarting on every main movement without stale resident code evidence
- [x] treating restart start as restart success
- [x] deleting or rewriting `provider-intake-state.json` to clear the state
- [x] weakening terminal Linear truth from CO-555
- [x] duplicating CO-515 stale-source recompute/invalidation
- [x] reopening CO-458
- [x] broadening into all CO-552 drift invariants

## Acceptance Criteria
- [x] Parent implementation consumes trustworthy `source_root_freshness` from CO-515 rather than recomputing it separately. Evidence: `readProviderIntakeAuthorityState` consumes the persisted CO-515 polling snapshot with refresh disabled for the trust gate.
- [x] Stale resident code behind `origin/main` blocks active WIP from continuing as fresh. Evidence: `readCompatibilityProjection` returns `providerIntake=null`, `providerIntakeUnavailable.reason=stale_supervised_control_host_source`, and empty running/retrying arrays for CO-512/CO-554/CO-555-shaped stale terminal retry claims.
- [x] Auto-restart is bounded, evidence-triggered, and clears stale state only after restart success is proven. Evidence: `evaluateControlHostSupervisionHealthPayload` returns `healthy=false` / `reason=stale_supervised_source_root` only for stale supervised source with clean stale source checkout and clean current intended checkout.
- [x] The control-host fails closed when auto-restart is unavailable, unsafe, or unproven. Evidence: `evaluateControlHostSupervisionHealthPayload` returns `healthy=true` / `reason=stale_supervised_source_fail_closed` when restart would loop on unsafe dirty checkout posture.
- [x] `co-status --format json` and `/ui/data.json` expose restart/fail-closed policy state with source evidence. Evidence: `ControlProviderIntakeUnavailablePayload` now carries `reason`, `action`, and `detail` for stale supervised control-host source.
- [x] `provider-intake-state.json` remains audit evidence and is not manually deleted or rewritten. Evidence: runtime projection builds an unavailable in-memory provider-intake view with claims cleared for trust only; no state-file deletion path was added.
- [x] Terminal Linear truth and CO-555 terminal-claim precedence still win before retry/resumable active-WIP projection. Evidence: post-recovery CO-512/CO-554/CO-555 terminal claims remain released/not_active with retry fields cleared and active/running/retrying counts at zero.
- [x] CO-556 does not reopen CO-458 or broaden into all CO-552 drift invariants. Evidence: implementation is scoped to control-host source freshness policy, provider-intake trust projection, and the provider/control-host freshness gauge.

## Validation
- [x] Child scoped source anchor read. Evidence: parent-relative `source-0/source.txt` read contained run and issue provenance for CO-556.
- [x] Child scoped JSON parse for `tasks/index.json`. Evidence: `node -e "JSON.parse(require('fs').readFileSync('tasks/index.json','utf8')); console.log('tasks/index.json ok')"` returned `tasks/index.json ok`.
- [x] Child scoped JSON parse for `docs/docs-freshness-registry.json`. Evidence: `node -e "JSON.parse(require('fs').readFileSync('docs/docs-freshness-registry.json','utf8')); console.log('docs/docs-freshness-registry.json ok')"` returned `docs/docs-freshness-registry.json ok`.
- [x] Child scoped protected-term check over declared CO-556 files. Evidence: Node protected-term scan over declared CO-556 docs/checklist/registry files returned `protected terms ok: 15`, and scoped `rg -n` returned matches for all protected terms.
- [x] Child scoped whitespace / diff check on declared touched files. Evidence: `git diff --check -- <declared CO-556 files plus tasks/index.json docs/TASKS.md docs/docs-freshness-registry.json>` exited 0 with no output.
- [ ] Parent docs-review before implementation. Evidence: not run before implementation; parent used the audited same-issue docs child lane for packet creation and will not hand off while the external freshness gate is blocked.
- [x] Parent focused stale resident code policy tests. Evidence: `npm run test -- orchestrator/tests/ControlRuntime.test.ts tests/control-host-supervision.spec.ts orchestrator/tests/ProviderControlHostFreshnessGauge.test.ts` passed 3 files / 172 tests.
- [x] Parent auto-restart success/failure/fail-closed tests. Evidence: `tests/control-host-supervision.spec.ts` covers clean stale-source restart request and dirty intended-checkout fail-closed behavior.
- [x] Parent `co-status --format json` or `/ui/data.json` projection assertion. Evidence: `orchestrator/tests/ControlRuntime.test.ts` asserts `providerIntakeUnavailable.reason=stale_supervised_control_host_source`, `action=fail_closed`, and empty running/retrying projections before source recovery.
- [x] Parent CO-555 terminal Linear truth precedence regression. Evidence: `orchestrator/tests/ControlRuntime.test.ts` covers CO-512/CO-554/CO-555-shaped terminal retry claims before recovery and released terminal claims after recovery.
- [x] Parent delegation guard, spec guard, focused tests, build, lint, full test, docs:check, repo stewardship, and diff budget. Evidence: `node scripts/delegation-guard.mjs`, `node scripts/spec-guard.mjs --dry-run`, focused vitest, `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `npm run repo:stewardship`, and `node scripts/diff-budget.mjs` passed.
- [ ] Parent docs freshness gate. Evidence: `npm run docs:freshness` failed on unrelated `docs:freshness:maintain` owner debt with canonical owner `CO-558`; `npm run docs:freshness:maintain -- --format json` reported `freshness_decision=block_spec_guard_pre_expiry`, `blocks_handoff=true`, `active_remediation_issue=CO-558`, `canonical_owner_key=docs:freshness:maintain`, `next_expiry=2026-05-25`, `action_required_count=26`, and `blocking_changed_paths=[]`.
- [ ] Parent implementation gate, standalone review, elegance pass, PR feedback drain, ready-review drain, and Linear handoff. Evidence: deferred because the required docs freshness gate blocks review handoff.

## Fallback Metadata
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? `Yes`.
- Decision: remove fail-open active-WIP handling on stale resident code.
- Large-refactor check: keep this scoped to stale resident code policy; CO-515 owns stale-source recompute/invalidation and CO-552 owns broader drift invariants.
- Minor-seam decision: acceptable because the policy consumes existing freshness evidence and preserves terminal Linear truth.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Stale resident code policy | Stale `source_root_freshness` can coexist with active WIP that still looks actionable. | remove fallback | CO-556 | `control-host-owner.json` or `co-status --format json` reports the supervised source root behind `origin/main`. | Observed 2026-05-20 | 2026-05-20 | This issue | Stale resident code triggers bounded auto-restart when safe or fail closed before work continues as fresh. | Focused control-host policy tests, status projection assertions, and CO-555 terminal-precedence regression coverage. |

## Progress Log
- 2026-05-20: Bounded same-issue docs child lane created the CO-556 docs-first packet and task registration from the parent-provided issue contract. Scope stayed docs-only; no implementation, tests, Linear mutation, GitHub mutation, workpad mutation, or full repo validation was run.
- 2026-05-20: Parent implementation added stale supervised control-host source freshness policy, provider-intake fail-closed trust gating, actionable `co-status --format json` unavailable payload details, provider/control-host audit coverage, and CO-555 incident-shape regressions. Focused/full implementation gates passed except `docs:freshness`, which is blocked by canonical owner `CO-558` / `docs:freshness:maintain` with `blocks_handoff=true`.

## Notes
- Parent owns authoritative issue workspace, Linear state, workpad, implementation, tests, PR lifecycle, and review handoff.
- This child lane leaves changes uncommitted for parent patch export.
- Review-state handoff remains blocked until CO-558 clears the repository-wide docs freshness maintenance gate or the gate returns clean for CO-556's branch.
