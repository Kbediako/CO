# Task Checklist - linear-11672de5-eb62-4942-bfdf-1d8282d786d2

- Linear Issue: `CO-68` / `11672de5-eb62-4942-bfdf-1d8282d786d2`
- MCP Task ID: `linear-11672de5-eb62-4942-bfdf-1d8282d786d2`
- Primary PRD: `docs/PRD-linear-11672de5-eb62-4942-bfdf-1d8282d786d2.md`
- TECH_SPEC: `tasks/specs/linear-11672de5-eb62-4942-bfdf-1d8282d786d2.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-11672de5-eb62-4942-bfdf-1d8282d786d2.md`

## Docs-First
- [x] PRD drafted for the `CO-68` child-lane shared-helper follow-up. Evidence: `docs/PRD-linear-11672de5-eb62-4942-bfdf-1d8282d786d2.md`.
- [x] TECH_SPEC drafted for the same lane. Evidence: `tasks/specs/linear-11672de5-eb62-4942-bfdf-1d8282d786d2.md`, `docs/TECH_SPEC-linear-11672de5-eb62-4942-bfdf-1d8282d786d2.md`.
- [x] ACTION_PLAN drafted for the same lane. Evidence: `docs/ACTION_PLAN-linear-11672de5-eb62-4942-bfdf-1d8282d786d2.md`.
- [x] `tasks/index.json` updated with the new TECH_SPEC entry. Evidence: `tasks/index.json`.
- [x] `docs/TASKS.md` updated with the new lane snapshot. Evidence: `docs/TASKS.md`.
- [x] Checklist mirrored to `.agent/task/linear-11672de5-eb62-4942-bfdf-1d8282d786d2.md`. Evidence: `.agent/task/linear-11672de5-eb62-4942-bfdf-1d8282d786d2.md`.
- [x] Standalone pre-implementation review approval captured in the spec/checklist notes for the narrow child-lane helper adoption. Evidence: `tasks/specs/linear-11672de5-eb62-4942-bfdf-1d8282d786d2.md`.
- [x] docs-review approved the `CO-68` packet for implementation. Evidence: `.runs/linear-11672de5-eb62-4942-bfdf-1d8282d786d2-co-68-docs-review/cli/2026-04-03T01-23-49-564Z-2d30c22d/manifest.json`, `.runs/linear-11672de5-eb62-4942-bfdf-1d8282d786d2-co-68-docs-review/cli/2026-04-03T01-23-49-564Z-2d30c22d/review/telemetry.json`.

## Investigation
- [x] Live Linear workflow states and the current issue state were rechecked before transition, and the issue was moved from `Ready` to `In Progress`. Evidence: `node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear issue-context --issue-id 11672de5-eb62-4942-bfdf-1d8282d786d2`, `node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear transition --issue-id 11672de5-eb62-4942-bfdf-1d8282d786d2 --state "In Progress" --format json`.
- [x] The single active `## Codex Workpad` comment was created and aligned with the issue scope before implementation work. Evidence: Linear comment `8478ffd8-3410-4d9a-8730-4d3047ab085e`.
- [x] The detached workspace was moved onto branch `linear/co-68-child-lane-json-tail-helper` before repo edits. Evidence: `git switch -c linear/co-68-child-lane-json-tail-helper`.
- [x] Baseline audit confirmed this is the bounded child-lane follow-up to `CO-50`, not a broader provider-worker parsing refactor. Evidence: `docs/PRD-linear-11672de5-eb62-4942-bfdf-1d8282d786d2.md`, `tasks/specs/linear-11672de5-eb62-4942-bfdf-1d8282d786d2.md`.

## Implementation
- [x] Replace the local child-lane trailing JSON-tail parser with the shared helper from `orchestrator/src/cli/utils/trailingJsonObject.ts`. Evidence: `orchestrator/src/cli/providerLinearChildLaneShell.ts`, `orchestrator/src/cli/utils/trailingJsonObject.ts`.
- [x] Keep the child-lane returned payload contract and path confinement behavior unchanged after the helper swap. Evidence: `orchestrator/src/cli/providerLinearChildLaneShell.ts`, `npx vitest run orchestrator/tests/ProviderLinearChildLaneShell.test.ts`.
- [x] Add focused child-lane regression coverage for prelude-log success and malformed-final-payload failure. Evidence: `orchestrator/tests/ProviderLinearChildLaneShell.test.ts`, `npx vitest run orchestrator/tests/ProviderLinearChildLaneShell.test.ts`.

## Validation
- [x] `MCP_RUNNER_TASK_ID=linear-11672de5-eb62-4942-bfdf-1d8282d786d2 node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear child-stream --pipeline docs-review --stream co-68-docs-review --format json`. Evidence: `.runs/linear-11672de5-eb62-4942-bfdf-1d8282d786d2-co-68-docs-review/cli/2026-04-03T01-23-49-564Z-2d30c22d/manifest.json`, `.runs/linear-11672de5-eb62-4942-bfdf-1d8282d786d2-co-68-docs-review/cli/2026-04-03T01-23-49-564Z-2d30c22d/review/telemetry.json`.
- [x] Focused `vitest` coverage for `orchestrator/tests/ProviderLinearChildLaneShell.test.ts`. Evidence: `npx vitest run orchestrator/tests/ProviderLinearChildLaneShell.test.ts`.
- [x] `node scripts/delegation-guard.mjs`. Evidence: `Delegation guard: OK (1 subagent manifest(s) found).`
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `✅ Spec guard: OK`.
- [x] `npm run build`. Evidence: command exited `0`.
- [x] `npm run lint`. Evidence: command exited `0`.
- [x] `npm run test`. Evidence: command exited `0`; Vitest reported `308` passing files / `2832` passing tests in `296.50s`, with late-tail files `tests/run-review.spec.ts` (`264103ms`) and `tests/cli-command-surface.spec.ts` (`295310ms`) completing before the final footer.
- [x] `npm run docs:check`. Evidence: `✅ docs:check: OK`.
- [x] `npm run docs:freshness`. Evidence: `docs:freshness OK - 3232 docs, 3242 registry entries`.
- [x] `node scripts/diff-budget.mjs`. Evidence: `✅ Diff budget: OK (scope=working-tree, files=9/25, lines=473/1200, +454/-19)`.
- [x] Manifest-backed standalone review plus explicit elegance review. Evidence: `.runs/linear-11672de5-eb62-4942-bfdf-1d8282d786d2/cli/2026-04-03T01-17-07-777Z-1cbef883/review/telemetry.json` (`status: succeeded`, `review_outcome: clean-success`, `termination_boundary: null`), `out/linear-11672de5-eb62-4942-bfdf-1d8282d786d2/manual/20260403T014335Z-elegance-review/00-elegance-review.md`.
- [x] `npm run pack:smoke`. Evidence: `✅ pack smoke passed`.

## Delivery
- [ ] Open or update the PR for `CO-68`, attach it to Linear, and handle automated or human feedback.
- [ ] Verify required validation is green, actionable review threads are handled, and the latest `origin/main` is merged before review handoff.
- [ ] Refresh the workpad to match the final review-ready state and stop coding once the issue reaches `In Review` or `Human Review`.
