# Task Checklist - linear-17c2a486-f5d8-4801-823e-edb8d9ec9936

- Linear Issue: `CO-61` / `17c2a486-f5d8-4801-823e-edb8d9ec9936`
- MCP Task ID: `linear-17c2a486-f5d8-4801-823e-edb8d9ec9936`
- Primary PRD: `docs/PRD-linear-17c2a486-f5d8-4801-823e-edb8d9ec9936.md`
- TECH_SPEC: `tasks/specs/linear-17c2a486-f5d8-4801-823e-edb8d9ec9936.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-17c2a486-f5d8-4801-823e-edb8d9ec9936.md`

## Docs-First
- [x] PRD drafted for the `CO-61` embedded screenshot-proof lane. Evidence: `docs/PRD-linear-17c2a486-f5d8-4801-823e-edb8d9ec9936.md`.
- [x] TECH_SPEC drafted with the bounded upload-and-embed contract and traceability plan. Evidence: `tasks/specs/linear-17c2a486-f5d8-4801-823e-edb8d9ec9936.md`, `docs/TECH_SPEC-linear-17c2a486-f5d8-4801-823e-edb8d9ec9936.md`.
- [x] ACTION_PLAN drafted for docs-review, implementation, live proof capture, and review handoff. Evidence: `docs/ACTION_PLAN-linear-17c2a486-f5d8-4801-823e-edb8d9ec9936.md`.
- [x] `tasks/index.json` updated with the new TECH_SPEC entry and review date. Evidence: `tasks/index.json`.
- [x] `docs/TASKS.md` updated with the new lane snapshot. Evidence: `docs/TASKS.md`.
- [x] `docs/docs-freshness-registry.json` updated for the new docs and task artifacts. Evidence: `docs/docs-freshness-registry.json`.
- [x] Checklist mirrored to `.agent/task/linear-17c2a486-f5d8-4801-823e-edb8d9ec9936.md`. Evidence: `.agent/task/linear-17c2a486-f5d8-4801-823e-edb8d9ec9936.md`.
- [x] Standalone pre-implementation self-review captured in the spec review notes. Evidence: `tasks/specs/linear-17c2a486-f5d8-4801-823e-edb8d9ec9936.md`.
- [x] docs-review approval captured for `linear-17c2a486-f5d8-4801-823e-edb8d9ec9936`. Evidence: `.runs/linear-17c2a486-f5d8-4801-823e-edb8d9ec9936-docs-review/cli/2026-04-02T01-09-25-701Z-8d32f28f/manifest.json`, `out/linear-17c2a486-f5d8-4801-823e-edb8d9ec9936/manual/20260402T011052Z-docs-review-fallback/00-docs-review-fallback.md`.

## Implementation
- [x] Add the bounded server-side Linear upload negotiation and signed PUT path for local screenshot artifacts. Evidence: `orchestrator/src/cli/control/providerLinearWorkflowFacade.ts`, `orchestrator/tests/ProviderLinearWorkflowFacade.test.ts`.
- [x] Rewrite local screenshot references to Linear-hosted asset URLs before the workpad comment mutation lands. Evidence: `orchestrator/src/cli/control/providerLinearWorkflowFacade.ts`, `orchestrator/tests/ProviderLinearWorkflowFacade.test.ts`.
- [x] Record proof traceability, including workpad comment id and uploaded Linear asset URL, in the helper result or audit path. Evidence: `orchestrator/src/cli/control/providerLinearWorkflowAudit.ts`, `orchestrator/src/cli/linearCliShell.ts`, `orchestrator/tests/LinearCliShell.test.ts`.
- [x] Update worker or workflow wording so `embedded directly in Linear, not only linked` is an explicit proof contract. Evidence: `orchestrator/src/cli/providerLinearWorkerRunner.ts`, `skills/linear/SKILL.md`, `bin/codex-orchestrator.ts`.

## Validation
- [x] Embed at least one screenshot directly in the live Linear workpad comment. Evidence: Linear comment `dd82f2d4-693e-45cd-a6ce-75b4442e9aaa`, `out/linear-17c2a486-f5d8-4801-823e-edb8d9ec9936/manual/20260402T122500Z-linear-embed-proof/co61-linear-embed-proof.png`.
- [x] Add targeted facade and CLI regressions for screenshot upload and embed behavior. Evidence: `orchestrator/tests/ProviderLinearWorkflowFacade.test.ts`, `orchestrator/tests/LinearCliShell.test.ts`.
- [x] `node scripts/delegation-guard.mjs`. Evidence: command completed successfully in the active workspace on 2026-04-02.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: command completed successfully in the active workspace on 2026-04-02.
- [x] `npm run build`. Evidence: command completed successfully in the active workspace on 2026-04-02.
- [x] `npm run lint`. Evidence: command completed successfully in the active workspace on 2026-04-02.
- [ ] `npm run test`. Evidence: pending.
- [x] `npm run docs:check`. Evidence: command completed successfully in the active workspace on 2026-04-02.
- [ ] `npm run docs:freshness`. Evidence: pending.
- [x] `node scripts/diff-budget.mjs`. Evidence: command completed successfully with the recorded explicit override reason on 2026-04-02.
- [x] Manifest-backed standalone review wrapper executed or truthful fallback recorded. Evidence: `out/linear-17c2a486-f5d8-4801-823e-edb8d9ec9936/manual/20260402T015251Z-review-fallback/00-manual-review.md`, `out/linear-17c2a486-f5d8-4801-823e-edb8d9ec9936/manual/20260402T015251Z-review-fallback/02-validation-status.md`.
- [x] Explicit elegance review recorded after review findings are addressed. Evidence: `out/linear-17c2a486-f5d8-4801-823e-edb8d9ec9936/manual/20260402T015251Z-review-fallback/01-elegance-review.md`.
- [x] `npm run pack:smoke`. Evidence: command completed successfully in the active workspace on 2026-04-02.

## Handoff
- [x] Exactly one persistent `## Codex Workpad` comment is kept current on the Linear issue. Evidence: Linear comment `dd82f2d4-693e-45cd-a6ce-75b4442e9aaa`.
- [ ] PR attached to the Linear issue before review-state transition. Evidence: pending.
- [ ] Latest `origin/main` merged into the branch before review-state transition. Evidence: pending.
- [ ] PR checks green and actionable review feedback handled or explicitly pushed back before review-state transition. Evidence: pending.
- [ ] Issue moved to the actual team review state (`In Review`) only after coding stops. Evidence: pending.
