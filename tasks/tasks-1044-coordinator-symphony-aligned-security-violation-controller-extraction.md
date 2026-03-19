# Task Checklist - 1044-coordinator-symphony-aligned-security-violation-controller-extraction

- MCP Task ID: `1044-coordinator-symphony-aligned-security-violation-controller-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-security-violation-controller-extraction.md`
- TECH_SPEC: `tasks/specs/1044-coordinator-symphony-aligned-security-violation-controller-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-security-violation-controller-extraction.md`

> This lane extracts the inline `/security/violation` route into a dedicated controller helper while preserving current redacted audit behavior, auth ordering, broader control policy, and the harder authority-bearing routes.

## Foundation
- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-security-violation-controller-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-security-violation-controller-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-security-violation-controller-extraction.md`, `tasks/specs/1044-coordinator-symphony-aligned-security-violation-controller-extraction.md`, `tasks/tasks-1044-coordinator-symphony-aligned-security-violation-controller-extraction.md`, `.agent/task/1044-coordinator-symphony-aligned-security-violation-controller-extraction.md`.
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1044-security-violation-controller-extraction-deliberation.md`.

## Shared Registry + Review Handoff
- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Delegated or local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1044-coordinator-symphony-aligned-security-violation-controller-extraction.md`, `docs/findings/1044-security-violation-controller-extraction-deliberation.md`.
- [x] docs-review approval/override captured for registered `1044`. Evidence: `.runs/1044-coordinator-symphony-aligned-security-violation-controller-extraction/cli/2026-03-07T09-27-00-200Z-e9044fd6/manifest.json`, `out/1044-coordinator-symphony-aligned-security-violation-controller-extraction/manual/20260307T092406Z-docs-first/05-docs-review-override.md`.

## Security Violation Controller Extraction
- [x] `/security/violation` route handling is extracted into a dedicated controller module. Evidence: `orchestrator/src/cli/control/securityViolationController.ts`, `orchestrator/src/cli/control/controlServer.ts`, `out/1044-coordinator-symphony-aligned-security-violation-controller-extraction/manual/20260307T093117Z-closeout/00-summary.md`.
- [x] Security-violation request parsing, redacted payload shaping, event emission, and response shaping move with the new controller without changing contracts. Evidence: `orchestrator/src/cli/control/securityViolationController.ts`, `orchestrator/tests/SecurityViolationController.test.ts`, `out/1044-coordinator-symphony-aligned-security-violation-controller-extraction/manual/20260307T093117Z-closeout/11-manual-security-violation-controller.json`.
- [x] Security-violation payload defaults, redaction posture, and response contract remain unchanged after extraction. Evidence: `orchestrator/tests/SecurityViolationController.test.ts`, `orchestrator/tests/ControlServer.test.ts`, `out/1044-coordinator-symphony-aligned-security-violation-controller-extraction/manual/20260307T093117Z-closeout/05b-targeted-tests.log`.
- [x] Route ordering, auth/runner-only gating, shared runtime/event hooks, and non-security routes remain in `controlServer.ts`. Evidence: `orchestrator/src/cli/control/controlServer.ts`, `out/1044-coordinator-symphony-aligned-security-violation-controller-extraction/manual/20260307T093117Z-closeout/12-elegance-review.md`.

## Validation + Closeout
- [x] `node scripts/delegation-guard.mjs`. Evidence: `out/1044-coordinator-symphony-aligned-security-violation-controller-extraction/manual/20260307T093117Z-closeout/01-delegation-guard.log`.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1044-coordinator-symphony-aligned-security-violation-controller-extraction/manual/20260307T093117Z-closeout/02-spec-guard.log`.
- [x] `npm run build`. Evidence: `out/1044-coordinator-symphony-aligned-security-violation-controller-extraction/manual/20260307T093117Z-closeout/03-build.log`.
- [x] `npm run lint`. Evidence: `out/1044-coordinator-symphony-aligned-security-violation-controller-extraction/manual/20260307T093117Z-closeout/04-lint.log`.
- [x] `npm run test`. Evidence: `out/1044-coordinator-symphony-aligned-security-violation-controller-extraction/manual/20260307T093117Z-closeout/05-test.log`, `.runs/1044-coordinator-symphony-aligned-security-violation-controller-extraction-guard/cli/2026-03-07T09-31-18-766Z-97579560/manifest.json`.
- [x] `npm run docs:check`. Evidence: `out/1044-coordinator-symphony-aligned-security-violation-controller-extraction/manual/20260307T093117Z-closeout/06-docs-check.log`.
- [x] `npm run docs:freshness`. Evidence: `out/1044-coordinator-symphony-aligned-security-violation-controller-extraction/manual/20260307T093117Z-closeout/07-docs-freshness.log`.
- [x] `node scripts/diff-budget.mjs`. Evidence: `out/1044-coordinator-symphony-aligned-security-violation-controller-extraction/manual/20260307T093117Z-closeout/08-diff-budget.log`, `out/1044-coordinator-symphony-aligned-security-violation-controller-extraction/manual/20260307T093117Z-closeout/13-override-notes.md`.
- [x] `npm run review`. Evidence: `out/1044-coordinator-symphony-aligned-security-violation-controller-extraction/manual/20260307T093117Z-closeout/09-review.log`, `out/1044-coordinator-symphony-aligned-security-violation-controller-extraction/manual/20260307T093117Z-closeout/13-override-notes.md`.
- [x] `npm run pack:smoke` when required by touched downstream-facing paths. Evidence: `out/1044-coordinator-symphony-aligned-security-violation-controller-extraction/manual/20260307T093117Z-closeout/10-pack-smoke.log`.
- [x] Manual mock security-violation controller artifact captured. Evidence: `out/1044-coordinator-symphony-aligned-security-violation-controller-extraction/manual/20260307T093117Z-closeout/11-manual-security-violation-controller.json`.
- [x] Elegance review completed. Evidence: `out/1044-coordinator-symphony-aligned-security-violation-controller-extraction/manual/20260307T093117Z-closeout/12-elegance-review.md`.
