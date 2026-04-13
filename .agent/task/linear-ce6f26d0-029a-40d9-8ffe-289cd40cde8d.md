# Task Checklist - linear-ce6f26d0-029a-40d9-8ffe-289cd40cde8d

- Linear Issue: `CO-94` / `ce6f26d0-029a-40d9-8ffe-289cd40cde8d`
- MCP Task ID: `linear-ce6f26d0-029a-40d9-8ffe-289cd40cde8d`
- Primary PRD: `docs/PRD-linear-ce6f26d0-029a-40d9-8ffe-289cd40cde8d.md`
- TECH_SPEC: `docs/TECH_SPEC-linear-ce6f26d0-029a-40d9-8ffe-289cd40cde8d.md`
- Task spec: `tasks/specs/linear-ce6f26d0-029a-40d9-8ffe-289cd40cde8d.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-ce6f26d0-029a-40d9-8ffe-289cd40cde8d.md`

## Docs-First
- [x] PRD, TECH_SPEC, ACTION_PLAN, task spec, task checklist, `.agent` mirror, `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`, and the active workpad source were drafted or refreshed for `CO-94`. Evidence: `docs/PRD-linear-ce6f26d0-029a-40d9-8ffe-289cd40cde8d.md`, `docs/TECH_SPEC-linear-ce6f26d0-029a-40d9-8ffe-289cd40cde8d.md`, `docs/ACTION_PLAN-linear-ce6f26d0-029a-40d9-8ffe-289cd40cde8d.md`, `tasks/specs/linear-ce6f26d0-029a-40d9-8ffe-289cd40cde8d.md`, `tasks/tasks-linear-ce6f26d0-029a-40d9-8ffe-289cd40cde8d.md`, `.agent/task/linear-ce6f26d0-029a-40d9-8ffe-289cd40cde8d.md`, `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`, `out/linear-ce6f26d0-029a-40d9-8ffe-289cd40cde8d/manual/workpad.md`.
- [x] Standalone pre-implementation self-review notes were captured in the spec packet before coding. Evidence: `tasks/specs/linear-ce6f26d0-029a-40d9-8ffe-289cd40cde8d.md`.
- [x] Docs-review delegation evidence is captured, and any fallback is recorded truthfully instead of treated as a packet-shape blocker. Evidence: `.runs/linear-ce6f26d0-029a-40d9-8ffe-289cd40cde8d-co-94-docs-review/cli/2026-04-09T08-52-01-943Z-a900f3f5/manifest.json`, `.runs/linear-ce6f26d0-029a-40d9-8ffe-289cd40cde8d-co-94-docs-review/cli/2026-04-09T08-52-01-943Z-a900f3f5/review/telemetry.json` (`clean-success`), and `.runs/linear-ce6f26d0-029a-40d9-8ffe-289cd40cde8d-docs-review/cli/2026-04-11T22-50-13-818Z-51e03d4e/manifest.json` (failed only on the repo-wide `docs:freshness` baseline during resumed validation).

## Implementation
- [x] One shared `run memory controller` selects candidate memory per role. Evidence: `orchestrator/src/cli/run/runMemoryController.ts`.
- [x] At least planner, reviewer, and one executor or delegate path consume the shared controller. Evidence: `orchestrator/src/cli/rlm/symbolic.ts`, `orchestrator/src/cli/rlmRunner.ts`, `scripts/lib/review-prompt-context.ts`, `orchestrator/src/cli/services/orchestratorCloudPromptBuilder.ts`, `orchestrator/src/cli/providerLinearWorkerRunner.ts`, `orchestrator/src/cli/providerLinearChildLaneRunner.ts`.
- [x] Controller output emits structured refs and provenance instead of flattened text-only selections. Evidence: `orchestrator/src/cli/run/runMemoryController.ts`, `orchestrator/tests/RunMemoryController.test.ts`.
- [x] Role-specific differences are encoded and covered by focused tests. Evidence: `orchestrator/tests/RunMemoryController.test.ts`, `orchestrator/tests/RlmSymbolic.test.ts`, `tests/review-prompt-context.spec.ts`, `orchestrator/tests/CloudPrompt.test.ts`, `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`, `orchestrator/tests/ProviderLinearChildLaneRunner.test.ts`.

## Validation
- [x] Focused controller/consumer tests pass on the resumed current-base branch. Evidence: `MCP_RUNNER_TASK_ID=linear-ce6f26d0-029a-40d9-8ffe-289cd40cde8d npm exec vitest run orchestrator/tests/RunMemoryController.test.ts orchestrator/tests/CloudPrompt.test.ts tests/review-prompt-context.spec.ts orchestrator/tests/RlmSymbolic.test.ts orchestrator/tests/ProviderLinearChildLaneRunner.test.ts orchestrator/tests/RlmRunnerConfig.test.ts orchestrator/tests/ProviderLinearWorkerRunner.test.ts` (`7` files / `198` tests after merging current `origin/main`).
- [x] Guard/build/lint gates pass on the resumed current-base branch. Evidence: `node scripts/delegation-guard.mjs` OK (`5` subagent manifests); `node scripts/spec-guard.mjs --dry-run` OK; `npm run build` OK; `npm run lint` OK.
- [x] Full validation floor is green after the merge commit and manual review fix. Evidence: `node scripts/delegation-guard.mjs` OK (`5` subagent manifests); `node scripts/spec-guard.mjs --dry-run` OK; `npm run build` OK; `npm run lint` OK; `npm run test` OK (`337` files / `3757` tests); `npm run docs:check` OK; `npm run docs:freshness` OK (`3779` docs / `3782` registry entries); `npm run repo:stewardship` OK (`4772` tracked files, `0` action-required); `node scripts/diff-budget.mjs` OK with the explicit docs-first/controller scope override; `npm run pack:smoke` OK.
- [x] Standalone review and elegance status are recorded truthfully. Evidence: manifest-backed review telemetry at `.runs/linear-ce6f26d0-029a-40d9-8ffe-289cd40cde8d/cli/2026-04-13T21-16-33-613Z-65c7afb2/review/telemetry.json` reports `review_outcome: failed-boundary` / `termination_boundary.kind: command-intent`; manual fallback review fixed prompt-pack provenance indexing and reran focused tests (`7` files / `198` tests); manual elegance pass kept the additive controller seam and found no follow-up simplification.
- [ ] Workpad and closeout artifacts record the final controller shape, adopted consumer surfaces, validation, review/elegance status, PR attachment, and ready-review drain. Evidence: pre-PR workpad refresh complete; PR attachment and ready-review drain pending.

## Handoff
- [x] The issue is active in `In Progress`, and exactly one persistent `## Codex Workpad` comment is maintained for the issue. Evidence: issue state verified with `linear issue-context` and transitioned via `linear transition --state "In Progress"`; workpad comment `b43e072e-4002-4299-beae-fb9298ba1b49`.
- [ ] A PR is attached before any review-state handoff. Evidence: pending.
- [x] Latest `origin/main` is merged into the branch before review-state transition. Evidence: merge conflicts resolved locally against `origin/main` (`a8a1ff9bb`) and recorded in merge commit `15920db57`.
- [ ] PR checks are green, actionable review feedback is handled or explicitly pushed back, `pr ready-review` drains cleanly, and the issue moves to `In Review` only after coding stops. Evidence: pending.
