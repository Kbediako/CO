# Task Checklist - 1043-coordinator-symphony-aligned-question-queue-controller-extraction

- MCP Task ID: `1043-coordinator-symphony-aligned-question-queue-controller-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-question-queue-controller-extraction.md`
- TECH_SPEC: `tasks/specs/1043-coordinator-symphony-aligned-question-queue-controller-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-question-queue-controller-extraction.md`

> This lane extracts the inline `/questions*` route cluster into a dedicated controller helper while preserving current queue behavior, auth ordering, runtime-side hooks, and broader control behavior.

## Foundation
- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-question-queue-controller-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-question-queue-controller-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-question-queue-controller-extraction.md`, `tasks/specs/1043-coordinator-symphony-aligned-question-queue-controller-extraction.md`, `tasks/tasks-1043-coordinator-symphony-aligned-question-queue-controller-extraction.md`, `.agent/task/1043-coordinator-symphony-aligned-question-queue-controller-extraction.md`.
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1043-question-queue-controller-extraction-deliberation.md`.

## Shared Registry + Review Handoff
- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Delegated or local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1043-coordinator-symphony-aligned-question-queue-controller-extraction.md`, `docs/findings/1043-question-queue-controller-extraction-deliberation.md`.
- [x] docs-review approval/override captured for registered `1043`. Evidence: `.runs/1043-coordinator-symphony-aligned-question-queue-controller-extraction/cli/2026-03-07T09-01-26-022Z-effcb3cb/manifest.json`, `out/1043-coordinator-symphony-aligned-question-queue-controller-extraction/manual/20260307T085804Z-docs-first/05-docs-review-override.md`.

## Question Queue Controller Extraction
- [x] `/questions*` route handling is extracted into a dedicated controller module. Evidence: `orchestrator/src/cli/control/questionQueueController.ts`, `orchestrator/src/cli/control/controlServer.ts`, `out/1043-coordinator-symphony-aligned-question-queue-controller-extraction/manual/20260307T091200Z-closeout/00-summary.md`.
- [x] Question-route request parsing, queue mutations, child-question resolution, and response shaping move with the new controller without changing contracts. Evidence: `orchestrator/src/cli/control/questionQueueController.ts`, `orchestrator/tests/QuestionQueueController.test.ts`, `out/1043-coordinator-symphony-aligned-question-queue-controller-extraction/manual/20260307T091200Z-closeout/11-manual-question-queue-controller.json`.
- [x] Question payloads, status codes, and active question lifecycle behavior remain unchanged after extraction. Evidence: `orchestrator/tests/QuestionQueueController.test.ts`, `orchestrator/tests/ControlServer.test.ts`, `out/1043-coordinator-symphony-aligned-question-queue-controller-extraction/manual/20260307T091200Z-closeout/05b-targeted-tests.log`.
- [x] Route ordering, auth/runner-only gating, expiry/background helpers, runtime publish hooks, Telegram projection signaling, and non-question control endpoints remain in `controlServer.ts`. Evidence: `orchestrator/src/cli/control/controlServer.ts`, `out/1043-coordinator-symphony-aligned-question-queue-controller-extraction/manual/20260307T091200Z-closeout/12-elegance-review.md`.

## Validation + Closeout
- [x] `node scripts/delegation-guard.mjs`. Evidence: `out/1043-coordinator-symphony-aligned-question-queue-controller-extraction/manual/20260307T091200Z-closeout/01-delegation-guard.log`.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1043-coordinator-symphony-aligned-question-queue-controller-extraction/manual/20260307T091200Z-closeout/02-spec-guard.log`.
- [x] `npm run build`. Evidence: `out/1043-coordinator-symphony-aligned-question-queue-controller-extraction/manual/20260307T091200Z-closeout/03-build.log`.
- [x] `npm run lint`. Evidence: `out/1043-coordinator-symphony-aligned-question-queue-controller-extraction/manual/20260307T091200Z-closeout/04-lint.log`.
- [x] `npm run test`. Evidence: `out/1043-coordinator-symphony-aligned-question-queue-controller-extraction/manual/20260307T091200Z-closeout/05-test.log`, `.runs/1043-coordinator-symphony-aligned-question-queue-controller-extraction-guard/cli/2026-03-07T09-08-32-578Z-92fb0ea9/manifest.json`.
- [x] `npm run docs:check`. Evidence: `out/1043-coordinator-symphony-aligned-question-queue-controller-extraction/manual/20260307T091200Z-closeout/06-docs-check.log`.
- [x] `npm run docs:freshness`. Evidence: `out/1043-coordinator-symphony-aligned-question-queue-controller-extraction/manual/20260307T091200Z-closeout/07-docs-freshness.log`.
- [x] `node scripts/diff-budget.mjs`. Evidence: `out/1043-coordinator-symphony-aligned-question-queue-controller-extraction/manual/20260307T091200Z-closeout/08-diff-budget.log`, `out/1043-coordinator-symphony-aligned-question-queue-controller-extraction/manual/20260307T091200Z-closeout/13-override-notes.md`.
- [x] `npm run review`. Evidence: `out/1043-coordinator-symphony-aligned-question-queue-controller-extraction/manual/20260307T091200Z-closeout/09-review.log`, `out/1043-coordinator-symphony-aligned-question-queue-controller-extraction/manual/20260307T091200Z-closeout/13-override-notes.md`.
- [x] `npm run pack:smoke` when required by touched downstream-facing paths. Evidence: `out/1043-coordinator-symphony-aligned-question-queue-controller-extraction/manual/20260307T091200Z-closeout/10-pack-smoke.log`.
- [x] Manual mock questions controller artifact captured. Evidence: `out/1043-coordinator-symphony-aligned-question-queue-controller-extraction/manual/20260307T091200Z-closeout/11-manual-question-queue-controller.json`.
- [x] Elegance review completed. Evidence: `out/1043-coordinator-symphony-aligned-question-queue-controller-extraction/manual/20260307T091200Z-closeout/12-elegance-review.md`.
