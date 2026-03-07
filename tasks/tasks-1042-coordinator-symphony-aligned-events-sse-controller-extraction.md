# Task Checklist - 1042-coordinator-symphony-aligned-events-sse-controller-extraction

- MCP Task ID: `1042-coordinator-symphony-aligned-events-sse-controller-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-events-sse-controller-extraction.md`
- TECH_SPEC: `tasks/specs/1042-coordinator-symphony-aligned-events-sse-controller-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-events-sse-controller-extraction.md`

> This lane extracts the standalone `/events` SSE route handling into a dedicated controller helper while preserving current stream bootstrap, client registration/removal, auth ordering, and broader control behavior.

## Foundation
- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-events-sse-controller-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-events-sse-controller-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-events-sse-controller-extraction.md`, `tasks/specs/1042-coordinator-symphony-aligned-events-sse-controller-extraction.md`, `tasks/tasks-1042-coordinator-symphony-aligned-events-sse-controller-extraction.md`, `.agent/task/1042-coordinator-symphony-aligned-events-sse-controller-extraction.md`.
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1042-events-sse-controller-extraction-deliberation.md`.

## Shared Registry + Review Handoff
- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Delegated or local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1042-coordinator-symphony-aligned-events-sse-controller-extraction.md`, `docs/findings/1042-events-sse-controller-extraction-deliberation.md`.
- [x] docs-review approval/override captured for registered `1042`. Evidence: `.runs/1042-coordinator-symphony-aligned-events-sse-controller-extraction/cli/2026-03-07T08-29-07-383Z-863412c4/manifest.json`, `out/1042-coordinator-symphony-aligned-events-sse-controller-extraction/manual/20260307T080319Z-docs-first/05-docs-review-override.md`.

## Events SSE Controller Extraction
- [ ] `/events` route handling is extracted into a dedicated controller module. Evidence: `orchestrator/src/cli/control/`, `orchestrator/src/cli/control/controlServer.ts`.
- [ ] SSE response bootstrap, client registration, and disconnect cleanup move with the new controller without changing stream contracts. Evidence: `orchestrator/src/cli/control/`, `orchestrator/tests/ControlServer.test.ts`.
- [ ] SSE headers, bootstrap payload framing, and active-client lifecycle behavior remain unchanged after extraction. Evidence: `orchestrator/src/cli/control/`, `orchestrator/tests/ControlServer.test.ts`.
- [ ] Route ordering, auth/runner-only gating, shared event fanout, `/api/v1/*`, and mutating control endpoints remain in `controlServer.ts`. Evidence: `orchestrator/src/cli/control/controlServer.ts`, `orchestrator/tests/ControlServer.test.ts`.

## Validation + Closeout
- [ ] `node scripts/delegation-guard.mjs`. Evidence: `out/1042-coordinator-symphony-aligned-events-sse-controller-extraction/manual/<timestamp>-closeout/01-delegation-guard.log`.
- [ ] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1042-coordinator-symphony-aligned-events-sse-controller-extraction/manual/<timestamp>-closeout/02-spec-guard.log`.
- [ ] `npm run build`. Evidence: `out/1042-coordinator-symphony-aligned-events-sse-controller-extraction/manual/<timestamp>-closeout/03-build.log`.
- [ ] `npm run lint`. Evidence: `out/1042-coordinator-symphony-aligned-events-sse-controller-extraction/manual/<timestamp>-closeout/04-lint.log`.
- [ ] `npm run test`. Evidence: `out/1042-coordinator-symphony-aligned-events-sse-controller-extraction/manual/<timestamp>-closeout/05-test.log`.
- [ ] `npm run docs:check`. Evidence: `out/1042-coordinator-symphony-aligned-events-sse-controller-extraction/manual/<timestamp>-closeout/06-docs-check.log`.
- [ ] `npm run docs:freshness`. Evidence: `out/1042-coordinator-symphony-aligned-events-sse-controller-extraction/manual/<timestamp>-closeout/07-docs-freshness.log`.
- [ ] `node scripts/diff-budget.mjs`. Evidence: `out/1042-coordinator-symphony-aligned-events-sse-controller-extraction/manual/<timestamp>-closeout/08-diff-budget.log`, `out/1042-coordinator-symphony-aligned-events-sse-controller-extraction/manual/<timestamp>-closeout/13-override-notes.md`.
- [ ] `npm run review`. Evidence: `out/1042-coordinator-symphony-aligned-events-sse-controller-extraction/manual/<timestamp>-closeout/09-review.log`, `out/1042-coordinator-symphony-aligned-events-sse-controller-extraction/manual/<timestamp>-closeout/13-override-notes.md`.
- [ ] `npm run pack:smoke` when required by touched downstream-facing paths. Evidence: `out/1042-coordinator-symphony-aligned-events-sse-controller-extraction/manual/<timestamp>-closeout/10-pack-smoke.log`.
- [ ] Manual mock events SSE controller artifact captured. Evidence: `out/1042-coordinator-symphony-aligned-events-sse-controller-extraction/manual/<timestamp>-closeout/11-manual-events-sse-controller.json`.
- [ ] Elegance review completed. Evidence: `out/1042-coordinator-symphony-aligned-events-sse-controller-extraction/manual/<timestamp>-closeout/12-elegance-review.md`.
