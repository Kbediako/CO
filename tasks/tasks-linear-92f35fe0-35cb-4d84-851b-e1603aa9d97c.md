# Task Checklist - CO-589

## Docs-First
- [x] Linear follow-up created and labeled with `Lifecycle: Implementation`, `Area: Infra`, `Area: Agents`, `Priority: P1`, and `Bug`.
- [x] CO-589 moved from Backlog to In Progress and isolated in `/Users/kbediako/Code/CO/.workspaces/linear-co-589-suppress-terminal-failed-proof`.
- [x] Workpad created: `16a3764e-a274-4155-88f8-fabcda041c9f`.
- [x] PRD, TECH_SPEC mirror, ACTION_PLAN, canonical task spec, task checklist, and agent mirror created.
- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` register the CO-589 packet.
- [x] Docs-review completed before source edits: `.runs/linear-92f35fe0-35cb-4d84-851b-e1603aa9d97c-docs-review/cli/2026-05-31T09-37-25-095Z-627deaef/manifest.json`.

## Acceptance
- [x] Released/not-active terminal same-issue claims are passive historical rows even when the retained run status is `failed`.
- [x] Real failed, retrying, or running work remains visible for non-terminal or active retry/running authority.
- [x] `selected`, `selected_issue_identifier`, active `issues[]`, and `/ui/data.json` agree on suppression.
- [x] Retained proof/debug data remains source-labeled audit evidence, not current authority.
- [ ] CO-582 no longer appears as current failed work in local `co-status --format json --dashboard`.

## Not Done If
- A released `provider_issue_released:not_active` claim with terminal same-issue truth can still appear as current `failed` status.
- A real non-terminal failed run is hidden.
- The implementation relies on manual provider-intake cleanup.
- The expired CO-398 compatibility projection fallback remains routine current-status authority.

## Fallback / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? Yes.
- Decision: remove stale compatibility projection authority for terminal released failed proof; justify retained source-labeled proof/debug payloads as audit evidence.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Control-host status surfaces | Retained failed proof drives current selected/active status after terminal released same-issue truth. | remove fallback | CO-589 / CO-398 | CO-582-shaped row is projected as failed current work. | CO-398 lineage, recurrence observed 2026-05-31 | 2026-05-31 | N/A after removal | CO-582 shape suppressed; non-terminal failed rows preserved. | Focused projection tests and `co-status` proof. |
| Control-host status surfaces | Retained proof/debug history stays visible. | justify retaining fallback | CO-589 / CO-398 | Operators need historical failure evidence. | CO-398 lineage | 2026-05-31 | Non-expiring while source-labeled | Replacement audit-history schema exists. | Tests show proof is not current authority. |

## Validation
- [x] `codex --version`: `codex-cli 0.135.0`.
- [x] Shared root clean at `ab8fd62b29` before worktree creation.
- [x] `gh pr list --repo Kbediako/CO --state open`: no open PRs.
- [x] `hygiene quota --format json`: zero quota-burning processes.
- [x] `co-status --format json --dashboard` reproduced CO-582 selected as current `failed` despite zero running/retrying.
- [x] Live CO-555 issue-context: Done/completed, so CO-589 is not duplicating a non-terminal owner.
- [x] Parallelization decision recorded: `stay_serial` / `single_bounded_change`.
- [x] Task index, docs snapshot, and freshness registry updated for CO-589.
- [x] Docs-review clean: `review_outcome=clean-success`, contract overall `clean`, axes clean.
- [x] Focused projection tests: `tests/selected-run-projection.spec.ts` 19 passed; `orchestrator/tests/ControlRuntime.test.ts` 137 passed.
- [x] Local read-model/UI status proof after implementation: targeted ControlRuntime regression proves `selected`, `issues`, and `buildUiDataset` suppress the reconciled terminal released failed proof.
- [x] Standard validation and standalone review: implementation-gate succeeded clean at `.runs/linear-92f35fe0-35cb-4d84-851b-e1603aa9d97c-implementation-gate/cli/2026-05-31T09-56-06-297Z-9f902a8e/manifest.json`.
- [x] `npm run pack:smoke` passed for CLI/control-status package surface.
- [ ] PR checks, ready-review, merge, shared-root closeout, and Linear Done transition.

## Notes
- Root cause evidence before start: dashboard selected CO-582 as failed from old run `2026-05-26T00-46-25-447Z-1766515d`; live Linear says CO-582 is Done, the claim is released/not_active, and quota hygiene reports zero quota-burning workers.
- Read-only gpt-5.5/xhigh RCA refined the fix to `selectedRunProjection.ts`: terminal Done/completed released claims are not included in failed-run reconciliation, so presenters render the stale selected-run context.
- This lane is a current-status projection authority fix, not provider-intake cleanup.
- Full validation passed: `npm run build`, `npm run lint` (pre-existing unrelated `no-explicit-any` warnings only), `npm run test`, `node scripts/spec-guard.mjs --dry-run`, `npm run docs:check`, `npm run docs:freshness`, `npm run repo:stewardship`, `node scripts/diff-budget.mjs`, and docs freshness maintain dry-run.
- Review evidence: gpt-5.5/xhigh implementation-gate contract overall `clean`, all axes `clean`, no code or agent-loop proposals. Raw elegance pass found no correctness issues.
- Live shared `co-status --dashboard` proof remains open until merge/restart because the running shared control-host is still on main.
