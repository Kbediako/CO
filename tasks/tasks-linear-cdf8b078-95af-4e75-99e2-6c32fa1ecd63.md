# Task Checklist - CO-571 released terminal claim reconciliation restart loop

- Linear Issue: `CO-571` / `cdf8b078-95af-4e75-99e2-6c32fa1ecd63`
- Task registry id: `20260520-linear-cdf8b078-95af-4e75-99e2-6c32fa1ecd63`
- MCP Task ID: `linear-cdf8b078-95af-4e75-99e2-6c32fa1ecd63`
- Primary PRD: `docs/PRD-linear-cdf8b078-95af-4e75-99e2-6c32fa1ecd63.md`
- TECH_SPEC: `tasks/specs/linear-cdf8b078-95af-4e75-99e2-6c32fa1ecd63.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-cdf8b078-95af-4e75-99e2-6c32fa1ecd63.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-cdf8b078-95af-4e75-99e2-6c32fa1ecd63.md`
- Agent task mirror: `.agent/task/linear-cdf8b078-95af-4e75-99e2-6c32fa1ecd63.md`
- Canonical owner key: `control-host:released-claim-reconcile-restart-loop`
- Workpad comment: `e7bfc570-8142-462c-8ab3-b852c50e3187`

## Workflow Setup
- [x] Live `linear issue-context` read for CO-571. Evidence: helper output on 2026-05-20 confirmed `In Progress`, no current PR, and no existing workpad.
- [x] Single `## Codex Workpad` created. Evidence: Linear comment `e7bfc570-8142-462c-8ab3-b852c50e3187`.
- [x] Decomposition matrix recorded in workpad before parallelization.
- [x] Exactly one `linear parallelization` decision recorded. Evidence: `stay_serial` / `single_bounded_change` with docs/test/research/review summary on 2026-05-20.

## Docs-First
- [x] PRD created with user-request translation, protected terms, parity matrix, non-goals, Not Done If, acceptance criteria, validation plan, and fallback/refactor decision. Evidence: `docs/PRD-linear-cdf8b078-95af-4e75-99e2-6c32fa1ecd63.md`.
- [x] Canonical TECH_SPEC created under `tasks/specs/`. Evidence: `tasks/specs/linear-cdf8b078-95af-4e75-99e2-6c32fa1ecd63.md`.
- [x] TECH_SPEC mirror created under `docs/`. Evidence: `docs/TECH_SPEC-linear-cdf8b078-95af-4e75-99e2-6c32fa1ecd63.md`.
- [x] ACTION_PLAN created. Evidence: `docs/ACTION_PLAN-linear-cdf8b078-95af-4e75-99e2-6c32fa1ecd63.md`.
- [x] Task checklist created. Evidence: `tasks/tasks-linear-cdf8b078-95af-4e75-99e2-6c32fa1ecd63.md`.
- [x] Task registration updated in canonical `tasks/index.json`. Evidence: `tasks/index.json`.
- [x] Task snapshot updated in `docs/TASKS.md`. Evidence: `docs/TASKS.md`.
- [x] Docs freshness registry updated for packet/checklist/mirror files. Evidence: `docs/docs-freshness-registry.json`.
- [x] `.agent/task` mirror created. Evidence: `.agent/task/linear-cdf8b078-95af-4e75-99e2-6c32fa1ecd63.md`.
- [x] Docs-review run or exact blocker recorded before implementation. Evidence: `.runs/linear-cdf8b078-95af-4e75-99e2-6c32fa1ecd63/cli/2026-05-20T18-03-32-648Z-cec26c42/manifest.json` succeeded.

## Protected Issue Terms
- [x] `provider_refresh_lifecycle_stuck`
- [x] `restart_required`
- [x] `refresh:claim_issue_by_id_reconcile`
- [x] `claim_issue_by_id:released`
- [x] `refresh:claim_reconcile`
- [x] `claim_reconcile:released`
- [x] released terminal historical claims
- [x] CO-472
- [x] CO-461
- [x] CO-469
- [x] CO-471
- [x] CO-476
- [x] CO-451
- [x] CO-468
- [x] no active workers/WIP 0/3
- [x] `retrying=1` projection mismatch
- [x] no fabricated coherent snapshot
- [x] no provider-intake manual edits

## Wrong Interpretations Rejected
- [x] timeout-only increase
- [x] provider-intake manual edits
- [x] one-off restart as the fix
- [x] treating all `/ui/data.json` timeouts as healthy
- [x] clearing genuine active refresh stalls
- [x] deleting released historical claim evidence
- [x] broadening into quota hygiene or unrelated capacity work

## Acceptance Criteria
- [x] CO-472 Done `claim_issue_by_id:released` terminal path does not drive restart-required health without active corroboration. Evidence: `npm run test -- ProviderIssueHandoff.test.ts`.
- [x] CO-461 Done `claim_reconcile:released` terminal path does not drive restart-required health without active corroboration. Evidence: `npm run test -- ProviderIssueHandoff.test.ts`.
- [x] CO-469 Duplicate/canceled `claim_issue_by_id:released` terminal path does not drive restart-required health without active corroboration. Evidence: `npm run test -- ProviderIssueHandoff.test.ts`.
- [x] CO-471 Done `claim_reconcile:released` terminal path does not drive restart-required health without active corroboration and does not manufacture retrying WIP from null retry metadata. Evidence: `npm run test -- ProviderIssueHandoff.test.ts` and `npm run test -- ControlRuntime.test.ts`.
- [x] CO-476 Duplicate/canceled `claim_issue_by_id:released` terminal path does not drive restart-required health without active corroboration. Evidence: `npm run test -- ProviderIssueHandoff.test.ts`.
- [x] CO-451 Done `claim_issue_by_id:released` terminal path does not drive restart-required health without active corroboration. Evidence: `npm run test -- ProviderIssueHandoff.test.ts`.
- [x] CO-468 Done `claim_issue_by_id:released` terminal path does not drive restart-required health without active corroboration. Evidence: `npm run test -- ProviderIssueHandoff.test.ts`.
- [x] Real active/stuck refresh path still fails closed with `provider_refresh_lifecycle_stuck` / `restart_required`. Evidence: `npm run test -- ProviderIssueHandoff.test.ts`.
- [x] `co-status --format json` and `/ui/data.json` remain truthful with no fabricated coherent snapshot. Evidence: `npm run test -- ControlRuntime.test.ts`.
- [x] No provider-intake manual edits, timeout-only fix, or one-off restart workaround. Evidence: implementation diff only changes classification/tests/docs.

## Validation
- [x] Docs-review manifest or exact blocker. Evidence: `.runs/linear-cdf8b078-95af-4e75-99e2-6c32fa1ecd63/cli/2026-05-20T18-03-32-648Z-cec26c42/manifest.json` succeeded.
- [x] Registry JSON parse check. Evidence: `node -e "JSON.parse(...tasks/index.json...); JSON.parse(...docs/docs-freshness-registry.json...)"` returned `json ok`.
- [x] Protected-term scan over declared CO-571 packet files. Evidence: scoped `rg` found CO-571, CO-472, CO-461, CO-469, CO-471, CO-476, CO-451, CO-468, `provider_refresh_lifecycle_stuck`, `restart_required`, released-claim phases, `retrying=1`, `no fabricated coherent snapshot`, and `no provider-intake manual edits`.
- [x] Scoped whitespace/diff check. Evidence: `git diff --check -- <declared CO-571 docs and registry files>` exited 0.
- [x] Focused released terminal claim regressions. Evidence: `npm run test -- ProviderIssueHandoff.test.ts`.
- [x] Focused retry projection consistency regression for released terminal claims with null retry fields. Evidence: `npm run test -- ControlRuntime.test.ts`.
- [x] Focused active stuck refresh regression. Evidence: `npm run test -- ProviderIssueHandoff.test.ts`.
- [x] `node scripts/spec-guard.mjs --dry-run`.
- [x] `npm run build`.
- [x] `npm run lint`. Evidence: passed with existing `DelegationMcpHealth.test.ts` warnings only.
- [x] `npm run test`. Evidence: diagnostics child run `.runs/linear-cdf8b078-95af-4e75-99e2-6c32fa1ecd63-guard/cli/2026-05-20T18-34-04-472Z-7b15b709/manifest.json` succeeded.
- [x] `npm run docs:check`.
- [x] `npm run docs:freshness`.
- [x] `node scripts/diff-budget.mjs`.
- [x] `npm run pack:smoke`.
- [x] Standalone review and elegance pass, or exact blocker recorded. Evidence: enforced `gpt-5.5/xhigh` review at `.runs/linear-cdf8b078-95af-4e75-99e2-6c32fa1ecd63/cli/2026-05-20T18-03-32-648Z-cec26c42/review/output.log` returned `overall_verdict=clean`; post-review minimality pass kept the scoped predicate/test shape unchanged.
- [x] Draft PR opened and linked to CO-571. Evidence: PR #855, `https://github.com/Kbediako/CO/pull/855`.

## CO-382 Fallback Decision Table
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? `Yes`.
- Decision: remove fallback where terminal released historical claim reconciliation is treated as active stuck refresh health.
- Retention decision: provider-intake released historical claims remain audit evidence and are not deleted.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Provider refresh lifecycle classification | Terminal released historical claims can escalate to active stuck refresh health. | remove fallback | CO-571 | Released terminal claim with no active run/retry/worker corroboration. | Observed 2026-05-20 | 2026-05-20 | This issue | Terminal released claims stop driving `restart_required`. | Focused released-claim regressions. |
| Provider-intake history | Released historical claims stay retained for traceability. | justify retaining fallback | Provider-intake audit contract / CO-571 | Terminal issue release records historical claim state. | Existing behavior before CO-571 | 2026-05-20 | Non-expiring durable retention only with rationale | Separate approved audit-history redesign replaces retained claim history with equivalent source-labeled evidence. | Tests keep claims inactive without deleting evidence. |

- Contract name: provider-intake released historical claim audit retention.
- Owning surface: provider-intake state and control-host status/read models.
- Steady-state proof: raw released claim rows remain source-labeled audit evidence, while terminal released `not_active` claims with complete cached metadata, null retry fields, and no active or cancelable retained run do not drive `restart_required` or retrying WIP.
- Tests/docs: `ProviderIssueHandoff.test.ts` terminal released metadata-only table, active-stuck regression, `ControlRuntime.test.ts` retry projection regression, and this CO-571 packet.
- Non-expiring rationale: retained released claim history is durable operator/audit evidence, not temporary compatibility debt; removal requires an approved archival redesign that preserves equivalent source-labeled claim/run evidence.

## Progress Log
- 2026-05-20: Live issue-context read, initial workpad created, serial same-turn parallelization decision recorded, and docs-first packet started. Parent later supplied CO-469 Duplicate/canceled evidence and CO-471 Done retry-projection mismatch evidence; packet included both as terminal released historical claim scope.
- 2026-05-20: Implementation committed and draft PR #855 opened after focused validation, pack smoke, and enforced `gpt-5.5/xhigh` review returned clean.
