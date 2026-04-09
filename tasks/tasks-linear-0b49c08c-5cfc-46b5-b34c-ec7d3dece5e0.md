# Task Checklist - linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0

- Linear Issue: `CO-88` / `0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0`
- MCP Task ID: `linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0`
- Primary PRD: `docs/PRD-linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0.md`
- TECH_SPEC: `docs/TECH_SPEC-linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0.md`
- Task spec: `tasks/specs/linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0.md`

## Docs-First
- [x] PRD, TECH_SPEC, ACTION_PLAN, task spec, task checklist, `.agent` mirror, `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`, and the initial workpad mirror were drafted or refreshed for `CO-88`. Evidence: `docs/PRD-linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0.md`, `docs/TECH_SPEC-linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0.md`, `docs/ACTION_PLAN-linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0.md`, `tasks/specs/linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0.md`, `tasks/tasks-linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0.md`, `.agent/task/linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0.md`, `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`, `out/linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0/manual/workpad.md`.
- [x] Standalone pre-implementation self-review notes were captured in the spec packet before coding. Evidence: `tasks/specs/linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0.md`.
- [x] Docs-review delegation evidence is captured and any packet-only findings are folded back before implementation. Evidence: `.runs/linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0-co-88-docs-review-rerun/cli/2026-04-09T08-44-01-637Z-5842f675/manifest.json`.

## Audit / Implementation
- [x] Selected-run-era truth surfaces are reconciled so current docs/tasks stop describing the removed legacy selected-run presenter seam as the live `/ui/data.json` authority where newer seams now own that truth. Evidence: `docs/PRD-linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0.md`, `docs/TECH_SPEC-linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0.md`, `tasks/specs/linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0.md`.
- [x] Duplicate uppercase `.agent/task/*_TEMPLATE.md` surfaces are removed or explicitly retained with current-consumer rationale. Evidence: legacy uppercase `.agent/task/*_TEMPLATE.md` files removed; canonical templates remain under `.agent/task/templates/`.
- [x] Review-launch compatibility behavior is removed or justified truthfully in `scripts/lib/review-launch-attempt.ts`, `scripts/run-review.ts`, and touched docs/tests. Evidence: `scripts/lib/review-launch-attempt.ts`, `scripts/run-review.ts`, `tests/run-review.spec.ts`, `orchestrator/tests/CodexOrchestratorCli.test.ts`, follow-up `CO-137`.
- [x] The SDK artifact contract is corrected so exported return values are truthful without a silent compatibility break. Evidence: `packages/sdk-node/src/orchestrator.ts`, `packages/sdk-node/tests/orchestrator.exec.test.ts`.
- [x] Design-system/design-reference placeholder claims are reduced to truthful current statements or archived follow-up references. Evidence: `docs/README.md`, `tasks/design-reference-pipeline.md`, `tasks/hi-fi-design-toolkit.md`, `docs/design/specs/DESIGN_REFERENCE_PIPELINE.md`, `docs/design/specs/HI_FI_DESIGN_TOOLKIT.md`.
- [x] Stale instruction, archive, and demo surfaces are cleaned up so touched present-tense claims match the current repo story. Evidence: `docs/AGENTS.md`, `.agent/AGENTS.md`, `packages/orchestrator-status-ui/app.js`, legacy MCP code-mode archive report removed during `CO-88`.
- [x] Compatibility leftovers that remain are documented with explicit live-consumer evidence. Evidence: `docs/TECH_SPEC-linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0.md`, `tasks/specs/linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0.md`, follow-up `CO-137`.

## Validation
- [x] Focused tests cover the touched runtime/package/review seams. Evidence: `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`, `orchestrator/tests/CodexOrchestratorCli.test.ts`, `packages/orchestrator/tests/StdioTracker.test.ts`, `tests/cli-frontend-test.spec.ts`, `tests/cli-command-surface.spec.ts`, `tests/linear-cli-help.spec.ts`, `tests/run-review.spec.ts`.
- [x] `node scripts/delegation-guard.mjs`, `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `npm run docs:freshness`, `node scripts/diff-budget.mjs`, `FORCE_CODEX_REVIEW=1 npm run review`, and `npm run pack:smoke` (when required) are completed or truthfully justified. Evidence: `out/linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0/manual/workpad.md`, `.runs/linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0/cli/2026-04-09T08-36-02-317Z-cd25368c/review/telemetry.json`, PR `#394` diff-budget override pending on the PR body/label for CI parity.
- [x] Standalone review plus explicit elegance/minimality pass are recorded before any review handoff. Evidence: `.runs/linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0/cli/2026-04-09T08-36-02-317Z-cd25368c/review/telemetry.json`, `out/linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0/manual/workpad.md`.

## Handoff
- [x] The issue is in `In Progress`, and exactly one persistent `## Codex Workpad` comment is maintained for the issue. Evidence: Linear workpad comment `ce7c900b-b3ea-4223-aaae-799a1b183e1b`, `out/linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0/manual/workpad.md`.
- [x] A PR is attached before any review-state handoff. Evidence: PR `#394` (`https://github.com/Kbediako/CO/pull/394`), Linear attachment on issue `CO-88`.
- [x] Latest `origin/main` is merged into the branch before review-state transition. Evidence: merge commit `236e2123b`.
- [ ] PR checks are green, actionable review feedback is handled or explicitly pushed back, `pr ready-review` drains cleanly, and the issue moves to `In Review` only after coding stops. Evidence: pending fresh PR workflow registration after sync commit `f5fa88f05` so `Core Lane` consumes the current diff-budget override metadata.
