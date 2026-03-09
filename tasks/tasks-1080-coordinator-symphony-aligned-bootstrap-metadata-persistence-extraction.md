# Task Checklist - 1080-coordinator-symphony-aligned-bootstrap-metadata-persistence-extraction

- MCP Task ID: `1080-coordinator-symphony-aligned-bootstrap-metadata-persistence-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-bootstrap-metadata-persistence-extraction.md`
- TECH_SPEC: `tasks/specs/1080-coordinator-symphony-aligned-bootstrap-metadata-persistence-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-bootstrap-metadata-persistence-extraction.md`

> This lane extracts the bootstrap metadata persistence phase out of `controlServerBootstrapLifecycle.ts` so the lifecycle stays a thin ordered coordinator while low-level auth/endpoint persistence mechanics move behind one bounded helper.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-bootstrap-metadata-persistence-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-bootstrap-metadata-persistence-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-bootstrap-metadata-persistence-extraction.md`, `tasks/specs/1080-coordinator-symphony-aligned-bootstrap-metadata-persistence-extraction.md`, `tasks/tasks-1080-coordinator-symphony-aligned-bootstrap-metadata-persistence-extraction.md`, `.agent/task/1080-coordinator-symphony-aligned-bootstrap-metadata-persistence-extraction.md`.
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1080-bootstrap-metadata-persistence-extraction-deliberation.md`, `out/1079-coordinator-symphony-aligned-telegram-bridge-bootstrap-handoff-extraction/manual/20260309T054759Z-closeout/14-next-slice-note.md`.

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1080-coordinator-symphony-aligned-bootstrap-metadata-persistence-extraction.md`, `docs/findings/1080-bootstrap-metadata-persistence-extraction-deliberation.md`.
- [ ] docs-review approval/override captured for registered `1080`. Evidence: `out/1080-coordinator-symphony-aligned-bootstrap-metadata-persistence-extraction/manual/<timestamp>-docs-first/00-summary.md`, `out/1080-coordinator-symphony-aligned-bootstrap-metadata-persistence-extraction/manual/<timestamp>-docs-first/05-docs-review-override.md`.

## Bootstrap Metadata Persistence

- [ ] Bootstrap metadata persistence extracted behind one bounded helper. Evidence: extracted control-local persistence helper, `orchestrator/tests/ControlServerBootstrapLifecycle.test.ts`.
- [ ] `controlServerBootstrapLifecycle.ts` delegates the metadata persistence phase to the extracted helper while preserving lifecycle startup ownership. Evidence: `orchestrator/src/cli/control/controlServerBootstrapLifecycle.ts`, `out/1080-coordinator-symphony-aligned-bootstrap-metadata-persistence-extraction/manual/<timestamp>-closeout/11-manual-bootstrap-persistence-check.json`.
- [ ] Persisted payloads, chmod hardening, and `persist -> expiry -> bridge` ordering remain intact under focused regressions. Evidence: `orchestrator/tests/ControlServerBootstrapLifecycle.test.ts`, `out/1080-coordinator-symphony-aligned-bootstrap-metadata-persistence-extraction/manual/<timestamp>-closeout/05b-targeted-tests.log`.

## Validation + Closeout

- [ ] `node scripts/delegation-guard.mjs`. Evidence: `out/1080-coordinator-symphony-aligned-bootstrap-metadata-persistence-extraction/manual/<timestamp>-closeout/01-delegation-guard.log`, `.runs/1080-coordinator-symphony-aligned-bootstrap-metadata-persistence-extraction-guard/cli/<timestamp>/manifest.json`.
- [ ] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1080-coordinator-symphony-aligned-bootstrap-metadata-persistence-extraction/manual/<timestamp>-closeout/02-spec-guard.log`.
- [ ] `npm run build`. Evidence: `out/1080-coordinator-symphony-aligned-bootstrap-metadata-persistence-extraction/manual/<timestamp>-closeout/03-build.log`.
- [ ] `npm run lint`. Evidence: `out/1080-coordinator-symphony-aligned-bootstrap-metadata-persistence-extraction/manual/<timestamp>-closeout/04-lint.log`.
- [ ] `npm run test`. Evidence: `out/1080-coordinator-symphony-aligned-bootstrap-metadata-persistence-extraction/manual/<timestamp>-closeout/05-test.log`, `out/1080-coordinator-symphony-aligned-bootstrap-metadata-persistence-extraction/manual/<timestamp>-closeout/05b-targeted-tests.log`.
- [ ] `npm run docs:check`. Evidence: `out/1080-coordinator-symphony-aligned-bootstrap-metadata-persistence-extraction/manual/<timestamp>-closeout/06-docs-check.log`.
- [ ] `npm run docs:freshness`. Evidence: `out/1080-coordinator-symphony-aligned-bootstrap-metadata-persistence-extraction/manual/<timestamp>-closeout/07-docs-freshness.log`.
- [ ] `node scripts/diff-budget.mjs`. Evidence: `out/1080-coordinator-symphony-aligned-bootstrap-metadata-persistence-extraction/manual/<timestamp>-closeout/08-diff-budget.log`.
- [ ] `npm run review`. Evidence: `out/1080-coordinator-symphony-aligned-bootstrap-metadata-persistence-extraction/manual/<timestamp>-closeout/09-review.log`.
- [ ] `npm run pack:smoke`. Evidence: `out/1080-coordinator-symphony-aligned-bootstrap-metadata-persistence-extraction/manual/<timestamp>-closeout/10-pack-smoke.log`.
- [ ] Manual/mock bootstrap persistence evidence captured. Evidence: `out/1080-coordinator-symphony-aligned-bootstrap-metadata-persistence-extraction/manual/<timestamp>-closeout/11-manual-bootstrap-persistence-check.json`.
- [ ] Elegance review completed. Evidence: `out/1080-coordinator-symphony-aligned-bootstrap-metadata-persistence-extraction/manual/<timestamp>-closeout/12-elegance-review.md`.
