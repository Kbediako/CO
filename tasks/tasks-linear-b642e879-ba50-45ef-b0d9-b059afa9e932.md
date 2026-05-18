# Task Checklist - linear-b642e879-ba50-45ef-b0d9-b059afa9e932

- Linear Issue: `CO-522` / `b642e879-ba50-45ef-b0d9-b059afa9e932`
- Canonical owner key: `docs:freshness:maintain`
- Protected owner-key token: `canonical_owner_key=docs:freshness:maintain`
- Required live-owner target: `new live owner CO-522`
- Current recovery gate: `block_spec_guard_pre_expiry` with `blocks_handoff=true`

## Scope
- [x] Create this single CO-522 task checklist file for the docs freshness owner rehome packet slice.
- [x] Preserve the terminal-owner blocker facts exactly: `owner_issue=CO-511`, `configured_owner_terminal`, `issue_state=Done`, `blocking_changed_paths=[]`, and `freshness_decision=block_diff_local`.
- [x] Preserve the canonical owner route exactly: `canonical_owner_key=docs:freshness:maintain`.
- [x] Preserve the target owner outcome exactly: `new live owner CO-522`.
- [x] Record the 2026-05-18 recovery evidence: owner `CO-522`, state `Blocked`, strict spec-guard succeeded, `action_required_count=180`, and `blocks_handoff=true`.
- [x] Refresh the CO-522 packet so the live gate is in scope and the old PR #795 owner-rehome handoff is historical evidence only. Evidence: this checklist, `tasks/specs/linear-b642e879-ba50-45ef-b0d9-b059afa9e932.md`, `docs/TECH_SPEC-linear-b642e879-ba50-45ef-b0d9-b059afa9e932.md`, and `docs/ACTION_PLAN-linear-b642e879-ba50-45ef-b0d9-b059afa9e932.md` now record the 2026-05-18 recovery gate.
- [x] Build a disposition manifest for current stale/pre-expiry actions. Evidence: `out/linear-b642e879-ba50-45ef-b0d9-b059afa9e932-recovery/disposition-manifest.json`, `out/linear-b642e879-ba50-45ef-b0d9-b059afa9e932-recovery/spec-preexpiry-local-classification.json`, and `out/linear-b642e879-ba50-45ef-b0d9-b059afa9e932-recovery/spec-preexpiry-disposition-summary.json`.

## Acceptance Criteria
- [x] Parent re-homes the live `docs:freshness:maintain` owner from terminal `owner_issue=CO-511` to `new live owner CO-522`.
- [x] Parent keeps `configured_owner_terminal`, `issue_state=Done`, `blocking_changed_paths=[]`, and `freshness_decision=block_diff_local` visible as machine-readable blocker evidence.
- [x] Parent verifies the replacement owner path by exact `canonical_owner_key=docs:freshness:maintain`.
- [x] Parent leaves product implementation lanes and unrelated provider-worker behavior out of the owner rehome.
- [x] Parent clears or explicitly owner-defers every current action without weakening gates, widening caps, creating duplicate owner issues, or using metadata-only freshness bumps. Evidence: `out/linear-b642e879-ba50-45ef-b0d9-b059afa9e932-recovery/docs-freshness-maintenance-after-spec-lifecycle.json` reports `repo_gate.action_required_count=0`, `repo_gate.blocks_handoff=false`, `capacity.current_entries=0`, `capacity.current_cohorts=0`, and `spec_guard.action_required_count=0`.
- [ ] Parent keeps CO-512 / PR #829 draft until `docs:freshness:maintain` and `co-status` report `blocks_handoff=false` or an explicit waiver is recorded.

## Validation
- [x] Child scoped file creation only. Evidence: this file is the only declared child-lane edit.
- [x] Parent reruns `npm run docs:freshness:maintain -- --format json` after importing the packet slice.
- [x] Parent records the before/after owner-truth output proving terminal `owner_issue=CO-511` no longer remains the live configured owner.
- [x] Parent runs broader docs freshness and spec validation in the authoritative issue workspace; both preserve existing stale-baseline blockers without weakening gates.
- [x] Parent records standalone review and elegance evidence before any review handoff.
- [x] Parent records PR and Linear lifecycle validation before any review handoff. Evidence: PR `#795` is attached to Linear `CO-522`; the single Linear workpad comment records the post-`origin/main` owner proof, local validation, standalone review, elegance pass, and the current `pr ready-review` gate; `CO-522` remains in `In Progress` until required checks and automated review feedback drain cleanly.
- [x] 2026-05-18 recovery reports captured: `out/linear-b642e879-ba50-45ef-b0d9-b059afa9e932-recovery/docs-freshness-maintenance.json`, `out/linear-b642e879-ba50-45ef-b0d9-b059afa9e932-recovery/docs-freshness.json`, and `out/linear-b642e879-ba50-45ef-b0d9-b059afa9e932-recovery/disposition-manifest.json`.
- [x] Parent reruns `node scripts/docs-freshness-maintain.mjs --check --format json`, `npm run docs:freshness`, `node scripts/spec-guard.mjs --dry-run`, and `npm run docs:check` after recovery changes. Evidence: `out/linear-b642e879-ba50-45ef-b0d9-b059afa9e932-recovery/docs-freshness-maintenance-final.json`, `out/linear-b642e879-ba50-45ef-b0d9-b059afa9e932-recovery/docs-freshness-final.json`, terminal `npm run docs:freshness`, terminal `node scripts/spec-guard.mjs --dry-run`, and terminal `npm run docs:check` all passed on 2026-05-18.
- [ ] Parent records `co-status --format json` evidence that the repo gate no longer blocks handoff.

## Non-Goals
- Do not edit parent-owned owner metadata, registry mirrors, `tasks/index.json`, `docs/TASKS.md`, workpad comments, PR state, or Linear state from this child lane.
- Do not weaken `docs:freshness`, `docs:freshness:maintain`, spec guard, or owner verification semantics.
- Do not hide or delete terminal-owner evidence to make the gate pass.
- Keep CO-514 provider-worker manifest serialization out of scope.
- Do not create another canonical `docs:freshness:maintain` owner while CO-522 verifies live.
- Do not move CO-512 forward while the CO-522 gate reports `blocks_handoff=true`.

## Evidence
- Source anchor: `ctx:sha256:1abafed42f940096a3f36ad165f83269a6d61f805f22db09605ed97dac2ae384#chunk:c000001`.
- Source manifest: `.runs/linear-b642e879-ba50-45ef-b0d9-b059afa9e932-co522-task-checklist/cli/2026-05-12T17-20-16-231Z-292db3b2/manifest.json`.
- Child lane scope: `tasks/tasks-linear-b642e879-ba50-45ef-b0d9-b059afa9e932.md` only.
- Local note: the referenced source payload path was not present in this child checkout, so this checklist anchors to the child prompt facts and the source manifest pointer.
- 2026-05-18 recovery note: ChatGPT Pro advisory and local reports agree that CO-522 remains the immediate owner and CO-552 should only record recurrence/process invariant work.
- ChatGPT Pro consultation: Browser session `CO-522 Freshness Blocker Strategy`, visible state `Extended Pro`. Recommendation: keep CO-522 active until the repo gate reports `blocks_handoff=false`; classify specs into terminal/archive, active real review, or exact owner-routing; add only a narrow lifecycle/index invariant and record broader recurrence in CO-552. Accepted: local recovery used manifest classification, terminal archival, active-spec review metadata, missing-index repair, and deterministic gate reruns. Rejected: blind `last_review` bumps, guard weakening, duplicate owner creation, and declaring CO-522 terminal while the gate blocks handoff.
- 2026-05-18 local clean gate evidence: `out/linear-b642e879-ba50-45ef-b0d9-b059afa9e932-recovery/docs-freshness-after-spec-lifecycle.json` has `stale_entries=0`, `terminal_lifecycle_entries=0`, `missing_in_registry=0`, `invalid_entries=0`, and `uncatalogued_docs=0`; `out/linear-b642e879-ba50-45ef-b0d9-b059afa9e932-recovery/docs-freshness-maintenance-after-spec-lifecycle.json` has `freshness_decision=clean`, `repo_gate.action_required_count=0`, and `repo_gate.blocks_handoff=false`.
- 2026-05-18 final local validation: `node scripts/spec-guard.mjs --dry-run`, `npm run docs:check`, `git diff --check`, `node scripts/docs-freshness.mjs --check --report out/linear-b642e879-ba50-45ef-b0d9-b059afa9e932-recovery/docs-freshness-final.json --summary-markdown out/linear-b642e879-ba50-45ef-b0d9-b059afa9e932-recovery/docs-freshness-final.md`, `node scripts/docs-freshness-maintain.mjs --check --format json --report out/linear-b642e879-ba50-45ef-b0d9-b059afa9e932-recovery/docs-freshness-maintenance-final.json`, `npm run docs:freshness`, `npm run repo:stewardship`, JSON parse checks for `tasks/index.json` and freshness registry/catalog/report artifacts, and `DIFF_BUDGET_OVERRIDE_REASON=... node scripts/diff-budget.mjs` all passed. The diff-budget override is required because the recovery intentionally generates archive stubs plus registry/lifecycle metadata.
- Delegation/manifest evidence: `.runs/linear-b642e879-ba50-45ef-b0d9-b059afa9e932-guard/cli/2026-05-18T08-17-21-680Z-82986f0f/manifest.json` succeeded for delegation-guard, build, lint, test, and spec-guard; direct parent `delegation-guard` then found 3 subagent manifest(s). Lint emitted existing warnings only in `orchestrator/tests/DelegationMcpHealth.test.ts`.
- `co-status --format json` was not recorded from this isolated recovery worktree because no worktree-local control-host endpoint exists under `.runs/local-mcp/cli/control-host/control_endpoint.json`; the authoritative `co-status` proof must be captured from the shared/main control host after this branch lands or after the control host is explicitly pointed at this head.

## CO-382 Fallback Decision Table

Large-refactor decision: bounded metadata repair; no large refactor is warranted because CO-522 re-homes the existing docs freshness owner pointer without changing owner-verification code or broad stale-doc classification.
Minor-seam decision: expire the owner-routing seam under live CO-522 evidence while the stale cohort baseline remains visible and over budget.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `docs:freshness:maintain` | Live owner pointer for repo-wide stale cohort baseline after terminal `CO-511` | expire fallback | CO-522 provider worker | `configured_owner_terminal` for `canonical_owner_key=docs:freshness:maintain` blocked provider-worker lanes | 2026-05-12 | 2026-05-12 | 2026-05-19 | Refresh, archive, or reclassify the underlying stale cohorts; if CO-522 stops verifying as a live same-project owner first, route through canonical owner reuse again | Before/after `docs:freshness:maintain -- --format json`; `docs:freshness` and spec-guard remain strict and still expose baseline stale debt |
