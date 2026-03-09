# Task Checklist - 1085-coordinator-symphony-aligned-control-server-request-shell-extraction

- MCP Task ID: `1085-coordinator-symphony-aligned-control-server-request-shell-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-control-server-request-shell-extraction.md`
- TECH_SPEC: `tasks/specs/1085-coordinator-symphony-aligned-control-server-request-shell-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-control-server-request-shell-extraction.md`

> This lane extracts the remaining inline `http.createServer(...)` request shell from `ControlServer.start()` so the server method keeps token/seed loading, seeded runtime assembly, instance construction, bootstrap assembly, startup sequencing, and ready-instance return while transport-level request-shell behavior moves behind one bounded helper.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-control-server-request-shell-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-control-server-request-shell-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-control-server-request-shell-extraction.md`, `tasks/specs/1085-coordinator-symphony-aligned-control-server-request-shell-extraction.md`, `tasks/tasks-1085-coordinator-symphony-aligned-control-server-request-shell-extraction.md`, `.agent/task/1085-coordinator-symphony-aligned-control-server-request-shell-extraction.md`.
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1085-control-server-request-shell-extraction-deliberation.md`, `out/1084-coordinator-symphony-aligned-control-server-seeded-runtime-assembly-extraction/manual/20260309T102726Z-closeout/14-next-slice-note.md`.

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1085-coordinator-symphony-aligned-control-server-request-shell-extraction.md`, `docs/findings/1085-control-server-request-shell-extraction-deliberation.md`.
- [ ] docs-review approval/override captured for registered `1085`. Evidence: `out/1085-coordinator-symphony-aligned-control-server-request-shell-extraction/manual/<timestamp>-docs-first/00-summary.md`, `out/1085-coordinator-symphony-aligned-control-server-request-shell-extraction/manual/<timestamp>-docs-first/05-docs-review-override.md`.

## Request Shell Extraction

- [ ] Request shell extracted behind one bounded helper. Evidence: extracted control-local helper, focused request-shell tests.
- [ ] `ControlServer.start()` delegates HTTP server/request-shell creation while preserving pre-instance `503`, request-context assembly, and top-level JSON error mapping. Evidence: `orchestrator/src/cli/control/controlServer.ts`, focused request-shell evidence.
- [ ] Request-shell regressions prove unavailable handling, live request-context wiring, and top-level error semantics remain intact. Evidence: focused request-shell/server tests.

## Validation + Closeout

- [ ] `node scripts/delegation-guard.mjs`. Evidence: `out/1085-coordinator-symphony-aligned-control-server-request-shell-extraction/manual/<timestamp>-closeout/01-delegation-guard.log`, `.runs/1085-coordinator-symphony-aligned-control-server-request-shell-extraction-*/cli/<timestamp>/manifest.json`.
- [ ] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1085-coordinator-symphony-aligned-control-server-request-shell-extraction/manual/<timestamp>-closeout/02-spec-guard.log`.
- [ ] `npm run build`. Evidence: `out/1085-coordinator-symphony-aligned-control-server-request-shell-extraction/manual/<timestamp>-closeout/03-build.log`.
- [ ] `npm run lint`. Evidence: `out/1085-coordinator-symphony-aligned-control-server-request-shell-extraction/manual/<timestamp>-closeout/04-lint.log`.
- [ ] `npm run test`. Evidence: `out/1085-coordinator-symphony-aligned-control-server-request-shell-extraction/manual/<timestamp>-closeout/05-test.log`, `out/1085-coordinator-symphony-aligned-control-server-request-shell-extraction/manual/<timestamp>-closeout/05b-targeted-tests.log`.
- [ ] `npm run docs:check`. Evidence: `out/1085-coordinator-symphony-aligned-control-server-request-shell-extraction/manual/<timestamp>-closeout/06-docs-check.log`.
- [ ] `npm run docs:freshness`. Evidence: `out/1085-coordinator-symphony-aligned-control-server-request-shell-extraction/manual/<timestamp>-closeout/07-docs-freshness.log`.
- [ ] `node scripts/diff-budget.mjs`. Evidence: `out/1085-coordinator-symphony-aligned-control-server-request-shell-extraction/manual/<timestamp>-closeout/08-diff-budget.log`.
- [ ] `npm run review`. Evidence: `out/1085-coordinator-symphony-aligned-control-server-request-shell-extraction/manual/<timestamp>-closeout/09-review.log`.
- [ ] `npm run pack:smoke`. Evidence: `out/1085-coordinator-symphony-aligned-control-server-request-shell-extraction/manual/<timestamp>-closeout/10-pack-smoke.log`.
- [ ] Manual/mock request-shell evidence captured. Evidence: `out/1085-coordinator-symphony-aligned-control-server-request-shell-extraction/manual/<timestamp>-closeout/11-manual-request-shell-check.json`.
- [ ] Elegance review completed. Evidence: `out/1085-coordinator-symphony-aligned-control-server-request-shell-extraction/manual/<timestamp>-closeout/12-elegance-review.md`.
