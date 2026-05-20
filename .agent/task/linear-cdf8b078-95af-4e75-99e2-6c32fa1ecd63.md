# Agent Task Mirror - linear-cdf8b078-95af-4e75-99e2-6c32fa1ecd63

- Linear Issue: `CO-571` / `cdf8b078-95af-4e75-99e2-6c32fa1ecd63`
- Task registry id: `20260520-linear-cdf8b078-95af-4e75-99e2-6c32fa1ecd63`
- Primary checklist: `tasks/tasks-linear-cdf8b078-95af-4e75-99e2-6c32fa1ecd63.md`
- PRD: `docs/PRD-linear-cdf8b078-95af-4e75-99e2-6c32fa1ecd63.md`
- TECH_SPEC: `tasks/specs/linear-cdf8b078-95af-4e75-99e2-6c32fa1ecd63.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-cdf8b078-95af-4e75-99e2-6c32fa1ecd63.md`

## Agent-Facing Scope
- [x] Preserve protected terms: `provider_refresh_lifecycle_stuck`, `restart_required`, `refresh:claim_issue_by_id_reconcile`, `claim_issue_by_id:released`, `refresh:claim_reconcile`, `claim_reconcile:released`, released terminal historical claims, CO-472, CO-461, CO-469, CO-471, CO-476, CO-451, CO-468, no active workers/WIP 0/3, `retrying=1` projection mismatch, no fabricated coherent snapshot, and no provider-intake manual edits.
- [x] Keep CO-469 Duplicate/canceled inside terminal released historical claim scope, not as a separate queue-capacity or workflow-state redesign.
- [x] Keep CO-471 retry projection mismatch inside terminal released historical claim scope: selected released claim with null retry metadata must not manufacture retrying WIP, while separate real retrying claims remain visible.
- [x] Preserve genuine active refresh stall fail-closed behavior.
- [x] Preserve `co-status --format json` and `/ui/data.json` truthfulness.
- [x] Preserve `provider-intake-state.json` as audit evidence; do not manually edit or delete it.

## CO-382 Fallback Decision Table
- Large-refactor decision: start narrow at the provider refresh lifecycle classification authority. Consolidate only if inspection proves duplicate predicates across health/status surfaces would otherwise diverge.
- Minor-seam decision: acceptable because CO-571 removes a specific terminal-released-claim false restart path while retaining audit evidence and preserving active-stall fail-closed behavior.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Provider refresh lifecycle classification | Terminal released historical claims can escalate to active stuck refresh health. | `remove fallback` | CO-571 | Released terminal claim with no active run/retry/worker corroboration. | Observed 2026-05-20 | 2026-05-20 | This issue | Terminal released claims stop driving `restart_required`. | Focused released-claim regressions. |
| Provider-intake history | Released historical claims stay retained for traceability. | `justify retaining fallback` | Provider-intake audit contract / CO-571 | Terminal issue release records historical claim state. | Existing behavior before CO-571 | 2026-05-20 | Non-expiring durable retention only with rationale | Separate approved audit-history redesign replaces retained claim history with equivalent source-labeled evidence. | Tests keep claims inactive without deleting evidence. |

- Contract name: provider-intake released historical claim audit retention.
- Owning surface: provider-intake state and control-host status/read models.
- Steady-state proof: raw released claim rows remain source-labeled audit evidence, while terminal released `not_active` claims with complete cached metadata, null retry fields, and no active or cancelable retained run do not drive `restart_required` or retrying WIP.
- Tests/docs: `ProviderIssueHandoff.test.ts` terminal released metadata-only table, active-stuck regression, `ControlRuntime.test.ts` retry projection regression, and this CO-571 packet.
- Non-expiring rationale: retained released claim history is durable operator/audit evidence, not temporary compatibility debt; removal requires an approved archival redesign that preserves equivalent source-labeled claim/run evidence.

## Validation Snapshot
- [x] Live `linear issue-context` read.
- [x] Single workpad created.
- [x] Exactly one same-turn `linear parallelization` decision recorded: `stay_serial` / `single_bounded_change`.
- [x] Docs packet created for PRD, TECH_SPEC, ACTION_PLAN, task checklist, and mirror.
- [x] Registry JSON updated and parsed. Evidence: `json ok` for `tasks/index.json` and `docs/docs-freshness-registry.json`.
- [x] Docs-review succeeded. Evidence: `.runs/linear-cdf8b078-95af-4e75-99e2-6c32fa1ecd63/cli/2026-05-20T18-03-32-648Z-cec26c42/manifest.json`.
- [x] Implementation and focused regressions completed for released terminal history, retry projection, and active stuck refresh.
- [x] Validation completed: spec guard, build, lint, focused tests, diagnostics child `npm test`, docs gates, diff budget, delegation guard, repo stewardship, pack smoke, and enforced standalone review.
- [x] Review/elegance completed. Evidence: enforced `gpt-5.5/xhigh` review returned `overall_verdict=clean`; post-review minimality pass kept the scoped predicate/test shape unchanged.
- [x] Draft PR opened. Evidence: PR #855, `https://github.com/Kbediako/CO/pull/855`.
- [ ] GitHub checks, CodeRabbit, Codex review, and handoff pending.
