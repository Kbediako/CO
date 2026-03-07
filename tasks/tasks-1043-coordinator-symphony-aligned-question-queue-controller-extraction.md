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
- [ ] `/questions*` route handling is extracted into a dedicated controller module. Evidence: `orchestrator/src/cli/control/`, `orchestrator/src/cli/control/controlServer.ts`.
- [ ] Question-route request parsing, queue mutations, child-question resolution, and response shaping move with the new controller without changing contracts. Evidence: `orchestrator/src/cli/control/`, `orchestrator/tests/ControlServer.test.ts`.
- [ ] Question payloads, status codes, and active question lifecycle behavior remain unchanged after extraction. Evidence: `orchestrator/src/cli/control/`, `orchestrator/tests/ControlServer.test.ts`.
- [ ] Route ordering, auth/runner-only gating, expiry/background helpers, runtime publish hooks, Telegram projection signaling, and non-question control endpoints remain in `controlServer.ts`. Evidence: `orchestrator/src/cli/control/controlServer.ts`, `orchestrator/tests/ControlServer.test.ts`.

## Validation + Closeout
- [ ] `node scripts/delegation-guard.mjs`. Evidence: `out/1043-coordinator-symphony-aligned-question-queue-controller-extraction/manual/<timestamp>-closeout/01-delegation-guard.log`.
- [ ] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1043-coordinator-symphony-aligned-question-queue-controller-extraction/manual/<timestamp>-closeout/02-spec-guard.log`.
- [ ] `npm run build`. Evidence: `out/1043-coordinator-symphony-aligned-question-queue-controller-extraction/manual/<timestamp>-closeout/03-build.log`.
- [ ] `npm run lint`. Evidence: `out/1043-coordinator-symphony-aligned-question-queue-controller-extraction/manual/<timestamp>-closeout/04-lint.log`.
- [ ] `npm run test`. Evidence: `out/1043-coordinator-symphony-aligned-question-queue-controller-extraction/manual/<timestamp>-closeout/05-test.log`.
- [ ] `npm run docs:check`. Evidence: `out/1043-coordinator-symphony-aligned-question-queue-controller-extraction/manual/<timestamp>-closeout/06-docs-check.log`.
- [ ] `npm run docs:freshness`. Evidence: `out/1043-coordinator-symphony-aligned-question-queue-controller-extraction/manual/<timestamp>-closeout/07-docs-freshness.log`.
- [ ] `node scripts/diff-budget.mjs`. Evidence: `out/1043-coordinator-symphony-aligned-question-queue-controller-extraction/manual/<timestamp>-closeout/08-diff-budget.log`, `out/1043-coordinator-symphony-aligned-question-queue-controller-extraction/manual/<timestamp>-closeout/13-override-notes.md`.
- [ ] `npm run review`. Evidence: `out/1043-coordinator-symphony-aligned-question-queue-controller-extraction/manual/<timestamp>-closeout/09-review.log`, `out/1043-coordinator-symphony-aligned-question-queue-controller-extraction/manual/<timestamp>-closeout/13-override-notes.md`.
- [ ] `npm run pack:smoke` when required by touched downstream-facing paths. Evidence: `out/1043-coordinator-symphony-aligned-question-queue-controller-extraction/manual/<timestamp>-closeout/10-pack-smoke.log`.
- [ ] Manual mock questions controller artifact captured. Evidence: `out/1043-coordinator-symphony-aligned-question-queue-controller-extraction/manual/<timestamp>-closeout/11-manual-question-queue-controller.json`.
- [ ] Elegance review completed. Evidence: `out/1043-coordinator-symphony-aligned-question-queue-controller-extraction/manual/<timestamp>-closeout/12-elegance-review.md`.
