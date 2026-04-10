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
- [x] Docs-review delegation evidence is captured and any repo-baseline fallback is recorded truthfully rather than as a packet-shape blocker. Evidence: `.runs/linear-cb368f80-6d3e-4deb-b89b-4bd3577562cc-co-145-docs-review/cli/2026-04-10T06-58-45-966Z-acba9f0e/manifest.json`, `out/linear-cb368f80-6d3e-4deb-b89b-4bd3577562cc/manual/20260410T065845Z-docs-review-fallback.md`.

## Implementation
- [x] Active-run rehydrate/upsert paths clear stale retry metadata when the claim is authoritatively running again. Evidence: `orchestrator/src/cli/control/providerIssueHandoff.ts`, `orchestrator/tests/ProviderIntakeState.test.ts`, `orchestrator/tests/ProviderIssueHandoff.test.ts`.
- [x] Real retry/resumable flows still preserve Backoff queue behavior. Evidence: `orchestrator/tests/ControlRuntime.test.ts`.
- [x] STATUS/runtime behavior stays source-of-truth driven without renderer-only duplicate suppression for this case. Evidence: `orchestrator/tests/ControlRuntime.test.ts`, `out/linear-cb368f80-6d3e-4deb-b89b-4bd3577562cc/manual/workpad.md`.

## Validation
- [x] Focused regressions cover the `CO-127` stale-retry rehydrate shape and preserved retry-owned behavior. Evidence: shared local artifact `/Users/kbediako/Code/CO/.runs/local-mcp/cli/control-host/provider-intake-state.json`; `npx vitest run orchestrator/tests/ProviderIntakeState.test.ts orchestrator/tests/ProviderIssueHandoff.test.ts`; `npx vitest run orchestrator/tests/ControlRuntime.test.ts`.
- [x] `node scripts/delegation-guard.mjs`, `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `node scripts/diff-budget.mjs`, `TASK=linear-cb368f80-6d3e-4deb-b89b-4bd3577562cc FORCE_CODEX_REVIEW=1 npm run review`, and `npm run pack:smoke` pass on the branch head; `npm run docs:freshness` remains a truthful existing repo baseline (`stale docs: 119`), not a CO-145 regression. Evidence: `/Users/kbediako/Code/CO/.runs/linear-cb368f80-6d3e-4deb-b89b-4bd3577562cc/cli/2026-04-10T06-49-00-349Z-42e47556/review/telemetry.json`, `out/linear-cb368f80-6d3e-4deb-b89b-4bd3577562cc/manual/workpad.md`.
- [x] Explicit elegance/minimality pass is recorded before review handoff. Evidence: `out/linear-cb368f80-6d3e-4deb-b89b-4bd3577562cc/manual/20260410T073300Z-elegance-review.md`.

## Handoff
- [x] The issue is in `In Progress`, and exactly one persistent `## Codex Workpad` comment is maintained for the issue. Evidence: Linear workpad comment `f98fff55-04c9-4089-bb66-3d21e0ef561a`, sourced from `out/linear-cb368f80-6d3e-4deb-b89b-4bd3577562cc/manual/workpad.md`.
- [ ] A PR is attached before any review-state handoff. Evidence: pending.
- [ ] Latest `origin/main` is merged into the branch before review-state transition. Evidence: pending.
- [ ] PR checks are green, actionable review feedback is handled or explicitly pushed back, `pr ready-review` drains cleanly, and the issue moves to `In Review` only after coding stops. Evidence: pending.
