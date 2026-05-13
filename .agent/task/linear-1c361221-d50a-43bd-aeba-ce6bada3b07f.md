# Task Checklist - linear-1c361221-d50a-43bd-aeba-ce6bada3b07f

- Linear Issue: `CO-105` / `1c361221-d50a-43bd-aeba-ce6bada3b07f`
- MCP Task ID: `linear-1c361221-d50a-43bd-aeba-ce6bada3b07f`
- Primary PRD: `docs/PRD-linear-1c361221-d50a-43bd-aeba-ce6bada3b07f.md`
- TECH_SPEC: `tasks/specs/linear-1c361221-d50a-43bd-aeba-ce6bada3b07f.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-1c361221-d50a-43bd-aeba-ce6bada3b07f.md`

## Docs-First
- [x] PRD drafted for the bounded macOS screenshot-proof capture lane. Evidence: `docs/PRD-linear-1c361221-d50a-43bd-aeba-ce6bada3b07f.md`.
- [x] TECH_SPEC drafted with the built-in macOS capture contract and failure-classification scope. Evidence: `tasks/specs/linear-1c361221-d50a-43bd-aeba-ce6bada3b07f.md`, `docs/TECH_SPEC-linear-1c361221-d50a-43bd-aeba-ce6bada3b07f.md`.
- [x] ACTION_PLAN drafted for docs-review, implementation, validation, and handoff. Evidence: `docs/ACTION_PLAN-linear-1c361221-d50a-43bd-aeba-ce6bada3b07f.md`.
- [x] `tasks/index.json` updated with the new TECH_SPEC entry and review date. Evidence: `tasks/index.json`.
- [x] `docs/TASKS.md` updated with the new lane snapshot. Evidence: `docs/TASKS.md`.
- [x] `docs/docs-freshness-registry.json` updated with the new packet entries. Evidence: `docs/docs-freshness-registry.json`.
- [x] Checklist mirrored to `.agent/task/linear-1c361221-d50a-43bd-aeba-ce6bada3b07f.md`. Evidence: `.agent/task/linear-1c361221-d50a-43bd-aeba-ce6bada3b07f.md`.
- [x] Standalone pre-implementation approval captured in spec notes. Evidence: `tasks/specs/linear-1c361221-d50a-43bd-aeba-ce6bada3b07f.md` `review_notes`.
- [x] docs-review approval captured for `linear-1c361221-d50a-43bd-aeba-ce6bada3b07f`. Evidence: initial child stream `.runs/linear-1c361221-d50a-43bd-aeba-ce6bada3b07f-co-105-docs-review/cli/2026-04-07T14-51-00-754Z-494c82f1/manifest.json` surfaced the packet-local `docs:check` issues, the rerun `.runs/linear-1c361221-d50a-43bd-aeba-ce6bada3b07f-co-105-docs-review-rerun/cli/2026-04-07T14-53-48-499Z-d042023d/manifest.json` passed `spec-guard` and `docs:check`, and manual fallback was accepted because `docs:freshness` failed only on the existing repo-wide stale-doc baseline (`stale docs: 121`; Task Packet stale=90, Task Mirror stale=18, Report Only stale=13). Supporting artifact: `out/linear-1c361221-d50a-43bd-aeba-ce6bada3b07f-co-105-docs-review-rerun/docs-freshness.json`.

## Workflow
- [x] Issue moved from `Ready` to the live started state (`In Progress`) before active coding. Evidence: packaged `linear transition --state "In Progress"` succeeded for `CO-105`.
- [x] Exactly one persistent `## Codex Workpad` comment is kept current on the issue. Evidence: packaged `linear upsert-workpad` created comment `3a1293e6-c861-4640-87b9-07b6ec718a4c`.
- [x] Workspace moved from detached `HEAD` onto a task branch based on the current workspace commit. Evidence: `linear/co-105-screenshot-proof-capture`.

## Investigation
- [x] The current `runtime-proof` and `upsert-workpad` seam split was audited before implementation. Evidence: `orchestrator/src/cli/control/providerLinearRuntimeProof.ts`, `orchestrator/src/cli/control/providerLinearWorkflowFacade.ts`, `orchestrator/src/cli/linearCliShell.ts`.
- [x] The `CO-97` closeout note about the failed local helper path was validated directly from the prior Linear workpad and preserved in the packet. Evidence: `linear issue-context --issue-id bd8f3cc3-0871-470b-8c86-2f3815b326f2`, `docs/PRD-linear-1c361221-d50a-43bd-aeba-ce6bada3b07f.md`, `tasks/specs/linear-1c361221-d50a-43bd-aeba-ce6bada3b07f.md`.
- [x] The likely implementation seam is identified as a new bounded capture helper and guidance updates, not an `upsert-workpad` or `runtime-proof` rewrite. Evidence: `docs/PRD-linear-1c361221-d50a-43bd-aeba-ce6bada3b07f.md`, `tasks/specs/linear-1c361221-d50a-43bd-aeba-ce6bada3b07f.md`.

## Implementation
- [x] Add the bounded repo-owned macOS screenshot-proof helper using built-in macOS tools only. Evidence: `orchestrator/src/cli/control/providerLinearScreenshotProof.ts`.
- [x] Add structured capture, permission, unreadable-output, and cleanup status reporting that stays separate from upload/embed outcomes. Evidence: `orchestrator/src/cli/control/providerLinearScreenshotProof.ts`, `orchestrator/tests/ProviderLinearScreenshotProof.test.ts`, `out/linear-1c361221-d50a-43bd-aeba-ce6bada3b07f/manual/20260408T011500Z-screenshot-proof-validation.json`.
- [x] Add audit and CLI routing for the new helper. Evidence: `orchestrator/src/cli/linearCliShell.ts`, `orchestrator/src/cli/control/providerLinearWorkflowAudit.ts`, `bin/codex-orchestrator.ts`, `orchestrator/tests/LinearCliShell.test.ts`, `orchestrator/tests/ProviderLinearWorkflowAudit.test.ts`.
- [x] Update worker and skill guidance so `screenshot-proof`, `runtime-proof`, and `upsert-workpad` each have explicit roles. Evidence: `orchestrator/src/cli/providerLinearWorkerRunner.ts`, `skills/linear/SKILL.md`, `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`.
- [x] Add focused regression coverage for command shaping and failure classification. Evidence: `orchestrator/tests/ProviderLinearScreenshotProof.test.ts`, `orchestrator/tests/LinearCliShell.test.ts`, `orchestrator/tests/ProviderLinearWorkflowAudit.test.ts`, `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`.

## Validation
- [x] `MCP_RUNNER_TASK_ID=linear-1c361221-d50a-43bd-aeba-ce6bada3b07f node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear child-stream --pipeline docs-review --stream co-105-docs-review --format json`. Evidence: initial child stream `.runs/linear-1c361221-d50a-43bd-aeba-ce6bada3b07f-co-105-docs-review/cli/2026-04-07T14-51-00-754Z-494c82f1/manifest.json` surfaced packet-local `docs:check` fixes; rerun `.runs/linear-1c361221-d50a-43bd-aeba-ce6bada3b07f-co-105-docs-review-rerun/cli/2026-04-07T14-53-48-499Z-d042023d/manifest.json` passed `spec-guard` and `docs:check`, then failed only on the existing repo-wide stale-doc baseline recorded in `out/linear-1c361221-d50a-43bd-aeba-ce6bada3b07f-co-105-docs-review-rerun/docs-freshness.json`.
- [x] `MCP_RUNNER_TASK_ID=linear-1c361221-d50a-43bd-aeba-ce6bada3b07f node scripts/delegation-guard.mjs`. Evidence: passed (`Delegation guard: OK (2 subagent manifest(s) found).`).
- [x] `MCP_RUNNER_TASK_ID=linear-1c361221-d50a-43bd-aeba-ce6bada3b07f node scripts/spec-guard.mjs --dry-run`. Evidence: passed (`✅ Spec guard: OK`).
- [x] `MCP_RUNNER_TASK_ID=linear-1c361221-d50a-43bd-aeba-ce6bada3b07f npm run build`. Evidence: passed on the implementation diff.
- [x] `MCP_RUNNER_TASK_ID=linear-1c361221-d50a-43bd-aeba-ce6bada3b07f npm run lint`. Evidence: passed on the post-fix diff.
- [x] `MCP_RUNNER_TASK_ID=linear-1c361221-d50a-43bd-aeba-ce6bada3b07f npm run test`. Evidence: passed on the post-fix diff (`316` files / `3112` tests).
- [x] `MCP_RUNNER_TASK_ID=linear-1c361221-d50a-43bd-aeba-ce6bada3b07f npm run docs:check`. Evidence: passed after the checklist evidence paths were refreshed.
- [x] `MCP_RUNNER_TASK_ID=linear-1c361221-d50a-43bd-aeba-ce6bada3b07f npm run docs:freshness`. Evidence: truthful fallback; failed only on the existing repo-wide stale-doc baseline (`stale docs: 121`; Task Packet stale=90, Task Mirror stale=18, Report Only stale=13), consistent with the earlier docs-review child-stream rerun.
- [x] `MCP_RUNNER_TASK_ID=linear-1c361221-d50a-43bd-aeba-ce6bada3b07f node scripts/diff-budget.mjs`. Evidence: explicit override accepted via `DIFF_BUDGET_OVERRIDE_REASON` because this provider-worker lane necessarily combines the new helper, focused tests, and the required docs/task mirrors.
- [x] Manifest-backed standalone review wrapper executed or truthful fallback recorded. Evidence: `npm run review -- --task linear-1c361221-d50a-43bd-aeba-ce6bada3b07f --uncommitted` reached `.runs/linear-1c361221-d50a-43bd-aeba-ce6bada3b07f/cli/2026-04-07T14-35-53-687Z-964b9df1/review/telemetry.json`, but the wrapper recorded `review_outcome: failed-boundary` / `termination_boundary: command-intent` after the review model launched its own validation suite; manual diff review replaced it for final closeout.
- [x] Explicit elegance review recorded after standalone review findings are addressed. Evidence: the manual fallback pass identified one real cleanup-boundary risk and fixed it by removing basename-based Preview document matching; the final helper now skips cleanup when Preview was already running and only auto-closes a single unambiguous Preview document.
- [x] `MCP_RUNNER_TASK_ID=linear-1c361221-d50a-43bd-aeba-ce6bada3b07f npm run pack:smoke` if downstream-facing CLI, package, or skill surfaces change. Evidence: passed on the post-fix diff.
- [x] One real screenshot is captured on this host via the new helper and embedded directly in the live CO-105 workpad. Evidence: live workpad embed uploaded hosted asset `d311793b-0f13-486d-b3b7-d44130e51253` in comment `3a1293e6-c861-4640-87b9-07b6ec718a4c`, and post-fix revalidation captured `/tmp/co-105-proof-revalidation.png` with cleanup status `skipped` in `out/linear-1c361221-d50a-43bd-aeba-ce6bada3b07f/manual/20260408T011500Z-screenshot-proof-validation.json`.
- [x] Failure-reporting paths are exercised for denied Screen Recording, denied Automation, unreadable output, and cleanup failure or skip. Evidence: `out/linear-1c361221-d50a-43bd-aeba-ce6bada3b07f/manual/20260408T011500Z-screenshot-proof-validation.json`.

## Handoff
- [ ] Workpad refreshed after docs, after implementation, and immediately before any review or merge handoff. Evidence: pending.
- [ ] PR attached to the Linear issue before review-state transition. Evidence: pending.
- [ ] Latest `origin/main` merged into the branch before review-state transition. Evidence: pending.
- [ ] PR checks green and actionable review feedback handled or explicitly pushed back before review-state transition. Evidence: pending.
- [x] Issue remains active until review handoff prerequisites are complete. Evidence: issue remains `In Progress`.
