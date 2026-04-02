# Task Checklist - linear-6efa7c09-7f2b-4a12-9d3f-69a6a7ff4db5

- Linear Issue: `CO-50` / `6efa7c09-7f2b-4a12-9d3f-69a6a7ff4db5`
- MCP Task ID: `linear-6efa7c09-7f2b-4a12-9d3f-69a6a7ff4db5`
- Primary PRD: `docs/PRD-linear-6efa7c09-7f2b-4a12-9d3f-69a6a7ff4db5.md`
- TECH_SPEC: `tasks/specs/linear-6efa7c09-7f2b-4a12-9d3f-69a6a7ff4db5.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-6efa7c09-7f2b-4a12-9d3f-69a6a7ff4db5.md`

## Docs-First
- [x] PRD drafted for the `CO-50` shared trailing-JSON helper issue. Evidence: `docs/PRD-linear-6efa7c09-7f2b-4a12-9d3f-69a6a7ff4db5.md`.
- [x] TECH_SPEC drafted for the same lane. Evidence: `tasks/specs/linear-6efa7c09-7f2b-4a12-9d3f-69a6a7ff4db5.md`, `docs/TECH_SPEC-linear-6efa7c09-7f2b-4a12-9d3f-69a6a7ff4db5.md`.
- [x] ACTION_PLAN drafted for the same lane. Evidence: `docs/ACTION_PLAN-linear-6efa7c09-7f2b-4a12-9d3f-69a6a7ff4db5.md`.
- [x] `tasks/index.json` updated with the new TECH_SPEC entry. Evidence: `tasks/index.json`.
- [x] `docs/TASKS.md` updated with the new lane snapshot. Evidence: `docs/TASKS.md`.
- [x] Checklist mirrored to `.agent/task/linear-6efa7c09-7f2b-4a12-9d3f-69a6a7ff4db5.md`. Evidence: `.agent/task/linear-6efa7c09-7f2b-4a12-9d3f-69a6a7ff4db5.md`.
- [x] Standalone pre-implementation review approval captured in the spec/checklist notes for the narrow shared-helper extraction. Evidence: `tasks/specs/linear-6efa7c09-7f2b-4a12-9d3f-69a6a7ff4db5.md`.
- [x] docs-review approved the `CO-50` packet for implementation. Evidence: `.runs/linear-6efa7c09-7f2b-4a12-9d3f-69a6a7ff4db5-co-50-docs-review/cli/2026-04-02T08-32-47-430Z-05430a37/manifest.json`, `.runs/linear-6efa7c09-7f2b-4a12-9d3f-69a6a7ff4db5-co-50-docs-review/cli/2026-04-02T08-32-47-430Z-05430a37/review/telemetry.json`.

## Investigation
- [x] Live Linear workflow states and the current issue state were rechecked before transition, and the issue was moved from `Ready` to `In Progress`. Evidence: `node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear issue-context --issue-id 6efa7c09-7f2b-4a12-9d3f-69a6a7ff4db5`, `node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear transition --issue-id 6efa7c09-7f2b-4a12-9d3f-69a6a7ff4db5 --state "In Progress" --format json`.
- [x] The single active `## Codex Workpad` comment was created and aligned with the issue scope before implementation work. Evidence: Linear comment `0d776a35-2857-4c4a-9542-561c8f58604d`.
- [x] The detached workspace was moved onto branch `linear/co-50-deduplicate-json-tail-parser` before repo edits. Evidence: `git branch -m linear/co-50-deduplicate-json-tail-parser`.
- [x] Baseline audit confirmed this is the bounded parser-dedup follow-up to `CO-37`, not a broader provider-worker or delegation-server refactor. Evidence: `docs/PRD-linear-6efa7c09-7f2b-4a12-9d3f-69a6a7ff4db5.md`, `tasks/specs/linear-6efa7c09-7f2b-4a12-9d3f-69a6a7ff4db5.md`.

## Implementation
- [x] Extract one shared trailing JSON-tail helper for the provider-worker child-stream and delegation-server spawn seams. Evidence: `orchestrator/src/cli/utils/trailingJsonObject.ts`, `orchestrator/src/cli/providerLinearChildStreamShell.ts`, `orchestrator/src/cli/delegationServer.ts`.
- [x] Keep the provider-worker and delegation-server returned payload contracts unchanged after the helper extraction. Evidence: `orchestrator/src/cli/providerLinearChildStreamShell.ts`, `orchestrator/src/cli/delegationServer.ts`, `npx vitest run orchestrator/tests/ProviderLinearChildStreamShell.test.ts orchestrator/tests/DelegationServer.test.ts`.
- [x] Add focused contract coverage so both seams prove prelude-log success and malformed-output failure. Evidence: `orchestrator/tests/ProviderLinearChildStreamShell.test.ts`, `orchestrator/tests/DelegationServer.test.ts`.

## Validation
- [x] `MCP_RUNNER_TASK_ID=linear-6efa7c09-7f2b-4a12-9d3f-69a6a7ff4db5 node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear child-stream --pipeline docs-review --stream co-50-docs-review --format json`. Evidence: `.runs/linear-6efa7c09-7f2b-4a12-9d3f-69a6a7ff4db5-co-50-docs-review/cli/2026-04-02T08-32-47-430Z-05430a37/manifest.json`, `.runs/linear-6efa7c09-7f2b-4a12-9d3f-69a6a7ff4db5-co-50-docs-review/cli/2026-04-02T08-32-47-430Z-05430a37/review/telemetry.json`.
- [x] `MCP_RUNNER_TASK_ID=linear-6efa7c09-7f2b-4a12-9d3f-69a6a7ff4db5 node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear child-stream --pipeline docs-relevance-advisory --stream co-50-turn1-scope-check --format json`. Evidence: `.runs/linear-6efa7c09-7f2b-4a12-9d3f-69a6a7ff4db5-co-50-turn1-scope-check/cli/2026-04-02T12-05-09-295Z-ecebe29f/manifest.json`.
- [x] Focused `vitest` coverage for `orchestrator/tests/ProviderLinearChildStreamShell.test.ts`. Evidence: `npx vitest run orchestrator/tests/ProviderLinearChildStreamShell.test.ts orchestrator/tests/DelegationServer.test.ts`.
- [x] Focused `vitest` coverage for `orchestrator/tests/DelegationServer.test.ts`. Evidence: `npx vitest run orchestrator/tests/ProviderLinearChildStreamShell.test.ts orchestrator/tests/DelegationServer.test.ts`.
- [x] `node scripts/delegation-guard.mjs`. Evidence: `Delegation guard: OK (3 subagent manifest(s) found).`
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `Spec guard: OK`.
- [x] `npm run build`. Evidence: command exited `0`.
- [x] `npm run lint`. Evidence: command exited `0`.
- [x] `npm run test`. Evidence: command exited `0` after a patience-first full-suite watch; `tests/run-review.spec.ts` completed in `338818ms`, `tests/cli-command-surface.spec.ts` completed in `376754ms`, and Vitest reported `306` passing files / `2802` passing tests in `378.25s`.
- [x] `npm run docs:check`. Evidence: `docs:check: OK`.
- [x] `npm run docs:freshness`. Evidence: `docs:freshness OK - 3190 docs, 3200 registry entries`.
- [x] `node scripts/diff-budget.mjs`. Evidence: `Diff budget: OK (scope=working-tree, files=22/25, lines=646/1200, +581/-65)`.
- [x] Manifest-backed standalone review plus explicit elegance review. Evidence: `.runs/linear-6efa7c09-7f2b-4a12-9d3f-69a6a7ff4db5/cli/2026-04-02T12-02-41-663Z-eca2eae2/review/telemetry.json` (`status: succeeded`, `review_outcome: bounded-success`, `termination_boundary.kind: relevant-reinspection-dwell`), `out/linear-6efa7c09-7f2b-4a12-9d3f-69a6a7ff4db5/manual/20260402T122300Z-elegance-review-refresh/00-elegance-review.md`.
- [x] `npm run pack:smoke`. Evidence: `pack smoke passed`.

## Delivery
- [ ] Open or update the PR for `CO-50`, attach it to Linear, and handle automated or human feedback.
- [ ] Verify required validation is green, actionable review threads are handled, and the latest `origin/main` is merged before review handoff.
- [ ] Refresh the workpad to match the final review-ready state and stop coding once the issue reaches `In Review` or `Human Review`.
