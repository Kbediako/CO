# Task Checklist - linear-cb368f80-6d3e-4deb-b89b-4bd3577562cc

- Linear Issue: `CO-145` / `cb368f80-6d3e-4deb-b89b-4bd3577562cc`
- MCP Task ID: `linear-cb368f80-6d3e-4deb-b89b-4bd3577562cc`
- Primary PRD: `docs/PRD-linear-cb368f80-6d3e-4deb-b89b-4bd3577562cc.md`
- TECH_SPEC: `docs/TECH_SPEC-linear-cb368f80-6d3e-4deb-b89b-4bd3577562cc.md`
- Task spec: `tasks/specs/linear-cb368f80-6d3e-4deb-b89b-4bd3577562cc.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-cb368f80-6d3e-4deb-b89b-4bd3577562cc.md`

## Docs-First
- [x] PRD, TECH_SPEC, ACTION_PLAN, task spec, task checklist, `.agent` mirror, `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`, and the initial workpad source were drafted or refreshed for `CO-145`. Evidence: `docs/PRD-linear-cb368f80-6d3e-4deb-b89b-4bd3577562cc.md`, `docs/TECH_SPEC-linear-cb368f80-6d3e-4deb-b89b-4bd3577562cc.md`, `docs/ACTION_PLAN-linear-cb368f80-6d3e-4deb-b89b-4bd3577562cc.md`, `tasks/specs/linear-cb368f80-6d3e-4deb-b89b-4bd3577562cc.md`, `tasks/tasks-linear-cb368f80-6d3e-4deb-b89b-4bd3577562cc.md`, `.agent/task/linear-cb368f80-6d3e-4deb-b89b-4bd3577562cc.md`, `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`, `out/linear-cb368f80-6d3e-4deb-b89b-4bd3577562cc/manual/workpad.md`.
- [x] Standalone pre-implementation self-review notes were captured in the spec packet before coding. Evidence: `tasks/specs/linear-cb368f80-6d3e-4deb-b89b-4bd3577562cc.md`.
- [x] Docs-review delegation evidence is captured with the successful rework rerun, and the earlier temporary `docs/TASKS.md` line-budget stop is recorded truthfully instead of being mistaken for a packet-shape blocker. Evidence: `tasks/specs/linear-cb368f80-6d3e-4deb-b89b-4bd3577562cc.md`, `.runs/linear-cb368f80-6d3e-4deb-b89b-4bd3577562cc-docs-review-rework-rerun/cli/2026-04-10T10-09-14-033Z-b783a0b7/manifest.json`, `.runs/linear-cb368f80-6d3e-4deb-b89b-4bd3577562cc-docs-review-rework-rerun/cli/2026-04-10T10-09-14-033Z-b783a0b7/run-summary.json`.

## Implementation
- [x] Active-run rehydrate/upsert paths clear stale retry metadata when the claim is authoritatively running again. Evidence: `orchestrator/src/cli/control/providerIssueHandoff.ts`, `orchestrator/tests/ProviderIntakeState.test.ts`, `orchestrator/tests/ProviderIssueHandoff.test.ts`.
- [x] Real retry/resumable flows still preserve Backoff queue behavior. Evidence: `orchestrator/tests/ControlRuntime.test.ts`.
- [x] STATUS/runtime behavior stays source-of-truth driven without renderer-only duplicate suppression for this case. Evidence: `orchestrator/tests/ControlRuntime.test.ts`, `out/linear-cb368f80-6d3e-4deb-b89b-4bd3577562cc/manual/workpad.md`.

## Validation
- [x] Focused regressions cover the `CO-127` stale-retry rehydrate shape and preserved retry-owned behavior. Evidence: `npx vitest run orchestrator/tests/ProviderIntakeState.test.ts orchestrator/tests/ProviderIssueHandoff.test.ts`, `npx vitest run orchestrator/tests/ControlRuntime.test.ts`, `out/linear-cb368f80-6d3e-4deb-b89b-4bd3577562cc/manual/20260410T101952Z-review-boundary-fallback.md`.
- [x] `node scripts/delegation-guard.mjs`, `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `npm run docs:freshness`, and `node scripts/diff-budget.mjs` pass on the current rework branch head. Evidence: `.runs/linear-cb368f80-6d3e-4deb-b89b-4bd3577562cc-docs-review-rework-rerun/cli/2026-04-10T10-09-14-033Z-b783a0b7/run-summary.json`, `out/linear-cb368f80-6d3e-4deb-b89b-4bd3577562cc/manual/20260410T101952Z-review-boundary-fallback.md`.
- [x] Parent standalone review ran, and its `failed-boundary` / `command-intent` result is recorded as a wrapper boundary failure with manual review fallback rather than as a code defect. Evidence: `.runs/linear-cb368f80-6d3e-4deb-b89b-4bd3577562cc/cli/2026-04-10T09-55-38-871Z-33f6541e/review/telemetry.json`, `out/linear-cb368f80-6d3e-4deb-b89b-4bd3577562cc/manual/20260410T101952Z-review-boundary-fallback.md`.
- [x] Explicit elegance/minimality pass is recorded before review handoff. Evidence: `out/linear-cb368f80-6d3e-4deb-b89b-4bd3577562cc/manual/20260410T101952Z-elegance-review-rework.md`.
- [ ] `npm run pack:smoke` passes on the current rework branch head. Evidence: pending.

## Handoff
- [x] The issue remains in active `Merging`, and exactly one persistent `## Codex Workpad` comment is maintained for the issue. Evidence: Linear workpad comment `62920a97-6b4c-48dd-b63d-c2f2ff1589ce`, sourced from `out/linear-cb368f80-6d3e-4deb-b89b-4bd3577562cc/manual/workpad.md`.
- [x] A PR is attached before any review-state handoff. Evidence: PR `#423`.
- [ ] Latest `origin/main` is merged into the branch before review-state transition. Evidence: pending.
- [ ] PR checks are green, actionable review feedback is handled or explicitly pushed back, `pr ready-review` drains cleanly, and the issue moves to `In Review` only after coding stops. Evidence: pending.
