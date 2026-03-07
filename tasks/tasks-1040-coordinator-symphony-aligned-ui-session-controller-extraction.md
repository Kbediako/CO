# Task Checklist - 1040-coordinator-symphony-aligned-ui-session-controller-extraction

- MCP Task ID: `1040-coordinator-symphony-aligned-ui-session-controller-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-ui-session-controller-extraction.md`
- TECH_SPEC: `tasks/specs/1040-coordinator-symphony-aligned-ui-session-controller-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-ui-session-controller-extraction.md`

> This lane extracts the standalone `/auth/session` route handling into a dedicated controller helper while preserving current loopback/origin/host validation, session issuance, auth ordering, and broader control behavior.

## Foundation
- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-ui-session-controller-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-ui-session-controller-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-ui-session-controller-extraction.md`, `tasks/specs/1040-coordinator-symphony-aligned-ui-session-controller-extraction.md`, `tasks/tasks-1040-coordinator-symphony-aligned-ui-session-controller-extraction.md`, `.agent/task/1040-coordinator-symphony-aligned-ui-session-controller-extraction.md`.
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1040-ui-session-controller-extraction-deliberation.md`.

## Shared Registry + Review Handoff
- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Delegated or local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1040-coordinator-symphony-aligned-ui-session-controller-extraction.md`, `docs/findings/1040-ui-session-controller-extraction-deliberation.md`, `.runs/1040-coordinator-symphony-aligned-ui-session-controller-extraction-boundary-review/cli/2026-03-07T06-14-56-301Z-72103429/manifest.json`.
- [x] docs-review approval/override captured for registered `1040`. Evidence: `.runs/1040-coordinator-symphony-aligned-ui-session-controller-extraction/cli/2026-03-07T06-16-47-065Z-8182ba1e/manifest.json`, `out/1040-coordinator-symphony-aligned-ui-session-controller-extraction/manual/20260307T061455Z-docs-first/00-summary.md`.

## UI Session Controller Extraction
- [ ] `/auth/session` route handling is extracted into a dedicated controller module. Evidence: `orchestrator/src/cli/control/`, `orchestrator/src/cli/control/controlServer.ts`.
- [ ] Loopback/allowed-host/origin validation and route-local response writing move with the new controller without changing route contracts. Evidence: `orchestrator/src/cli/control/`, `orchestrator/tests/ControlServer.test.ts`.
- [ ] Session issuance semantics remain unchanged after extraction. Evidence: `orchestrator/src/cli/control/`, `orchestrator/tests/ControlServer.test.ts`.
- [ ] `/api/v1/*`, webhooks, event stream setup, auth ordering, and mutating control endpoints remain in `controlServer.ts`. Evidence: `orchestrator/src/cli/control/controlServer.ts`, `orchestrator/tests/ControlServer.test.ts`.

## Validation + Closeout
- [ ] `node scripts/delegation-guard.mjs`. Evidence: `out/1040-coordinator-symphony-aligned-ui-session-controller-extraction/manual/<timestamp>-closeout/01-delegation-guard.log`.
- [ ] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1040-coordinator-symphony-aligned-ui-session-controller-extraction/manual/<timestamp>-closeout/02-spec-guard.log`.
- [ ] `npm run build`. Evidence: `out/1040-coordinator-symphony-aligned-ui-session-controller-extraction/manual/<timestamp>-closeout/03-build.log`.
- [ ] `npm run lint`. Evidence: `out/1040-coordinator-symphony-aligned-ui-session-controller-extraction/manual/<timestamp>-closeout/04-lint.log`.
- [ ] `npm run test`. Evidence: `out/1040-coordinator-symphony-aligned-ui-session-controller-extraction/manual/<timestamp>-closeout/05-test.log`.
- [ ] `npm run docs:check`. Evidence: `out/1040-coordinator-symphony-aligned-ui-session-controller-extraction/manual/<timestamp>-closeout/06-docs-check.log`.
- [ ] `npm run docs:freshness`. Evidence: `out/1040-coordinator-symphony-aligned-ui-session-controller-extraction/manual/<timestamp>-closeout/07-docs-freshness.log`.
- [ ] `node scripts/diff-budget.mjs`. Evidence: `out/1040-coordinator-symphony-aligned-ui-session-controller-extraction/manual/<timestamp>-closeout/08-diff-budget.log`, `out/1040-coordinator-symphony-aligned-ui-session-controller-extraction/manual/<timestamp>-closeout/13-override-notes.md`.
- [ ] `npm run review`. Evidence: `out/1040-coordinator-symphony-aligned-ui-session-controller-extraction/manual/<timestamp>-closeout/09-review.log`, `out/1040-coordinator-symphony-aligned-ui-session-controller-extraction/manual/<timestamp>-closeout/13-override-notes.md`.
- [ ] `npm run pack:smoke` when required by touched downstream-facing paths. Evidence: `out/1040-coordinator-symphony-aligned-ui-session-controller-extraction/manual/<timestamp>-closeout/10-pack-smoke.log`.
- [ ] Manual mock UI-session artifact captured. Evidence: `out/1040-coordinator-symphony-aligned-ui-session-controller-extraction/manual/<timestamp>-closeout/11-manual-ui-session-controller.json`.
- [ ] Elegance review completed. Evidence: `out/1040-coordinator-symphony-aligned-ui-session-controller-extraction/manual/<timestamp>-closeout/12-elegance-review.md`.
