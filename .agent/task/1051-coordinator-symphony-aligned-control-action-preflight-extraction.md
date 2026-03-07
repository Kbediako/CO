# Task Checklist - 1051-coordinator-symphony-aligned-control-action-preflight-extraction

- MCP Task ID: `1051-coordinator-symphony-aligned-control-action-preflight-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-control-action-preflight-extraction.md`
- TECH_SPEC: `tasks/specs/1051-coordinator-symphony-aligned-control-action-preflight-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-control-action-preflight-extraction.md`

> This lane extracts the inline `/control/action` preflight layer into a dedicated helper module while preserving session/body guardrails, transport hardening, replay behavior, canonical early reject responses, and leaving final response plus control mutation authority in `controlServer.ts`.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-control-action-preflight-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-control-action-preflight-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-control-action-preflight-extraction.md`, `tasks/specs/1051-coordinator-symphony-aligned-control-action-preflight-extraction.md`, `tasks/tasks-1051-coordinator-symphony-aligned-control-action-preflight-extraction.md`, `.agent/task/1051-coordinator-symphony-aligned-control-action-preflight-extraction.md`.
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1051-control-action-preflight-extraction-deliberation.md`.

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Delegated or local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1051-coordinator-symphony-aligned-control-action-preflight-extraction.md`, `docs/findings/1051-control-action-preflight-extraction-deliberation.md`.
- [x] docs-review approval/override captured for registered `1051`. Evidence: `.runs/1051/cli/2026-03-07T13-53-37-857Z-091494b4/manifest.json`, `out/1051-coordinator-symphony-aligned-control-action-preflight-extraction/manual/20260307T134658Z-docs-first/05-docs-review-override.md`.

## Control Action Preflight Extraction

- [ ] `/control/action` preflight handling is extracted into a dedicated helper module under `orchestrator/src/cli/control/`. Evidence: `orchestrator/src/cli/control/`, `orchestrator/src/cli/control/controlServer.ts`.
- [ ] Request parsing, normalization, transport preflight, replay/confirmation decisions, and canonical traceability derivation move with the new helper without changing contracts. Evidence: `orchestrator/src/cli/control/`, `orchestrator/tests/`, `orchestrator/tests/ControlServer.test.ts`.
- [ ] `/control/action` early reject, confirmation-required, replay, and confirmation-scope transport behavior remain unchanged after extraction. Evidence: `orchestrator/src/cli/control/`, `orchestrator/tests/`, `orchestrator/tests/ControlServer.test.ts`, `out/1051-coordinator-symphony-aligned-control-action-preflight-extraction/manual/<pending>/11-manual-control-action-preflight.json`.
- [ ] Route ordering, auth/runner-only gating, final control mutation, persistence sequencing, runtime publish, and audit emission remain in `controlServer.ts`. Evidence: `orchestrator/src/cli/control/controlServer.ts`, `orchestrator/tests/ControlServer.test.ts`, `out/1051-coordinator-symphony-aligned-control-action-preflight-extraction/manual/<pending>/00-summary.md`.

## Validation + Closeout

- [ ] `node scripts/delegation-guard.mjs`. Evidence: `out/1051-coordinator-symphony-aligned-control-action-preflight-extraction/manual/<pending>/01-delegation-guard.log`.
- [ ] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1051-coordinator-symphony-aligned-control-action-preflight-extraction/manual/<pending>/02-spec-guard.log`.
- [ ] `npm run build`. Evidence: `out/1051-coordinator-symphony-aligned-control-action-preflight-extraction/manual/<pending>/03-build.log`.
- [ ] `npm run lint`. Evidence: `out/1051-coordinator-symphony-aligned-control-action-preflight-extraction/manual/<pending>/04-lint.log`.
- [ ] `npm run test`. Evidence: `out/1051-coordinator-symphony-aligned-control-action-preflight-extraction/manual/<pending>/05-test.log`, `.runs/1051-coordinator-symphony-aligned-control-action-preflight-extraction-guard/cli/<pending>/manifest.json`.
- [ ] `npm run docs:check`. Evidence: `out/1051-coordinator-symphony-aligned-control-action-preflight-extraction/manual/<pending>/06-docs-check.log`.
- [ ] `npm run docs:freshness`. Evidence: `out/1051-coordinator-symphony-aligned-control-action-preflight-extraction/manual/<pending>/07-docs-freshness.log`.
- [ ] `node scripts/diff-budget.mjs`. Evidence: `out/1051-coordinator-symphony-aligned-control-action-preflight-extraction/manual/<pending>/08-diff-budget.log`, `out/1051-coordinator-symphony-aligned-control-action-preflight-extraction/manual/<pending>/13-override-notes.md`.
- [ ] `npm run review`. Evidence: `out/1051-coordinator-symphony-aligned-control-action-preflight-extraction/manual/<pending>/09-review.log`, `out/1051-coordinator-symphony-aligned-control-action-preflight-extraction/manual/<pending>/13-override-notes.md`.
- [ ] `npm run pack:smoke` not required because no downstream-facing CLI/package/skills/review-wrapper paths changed. Evidence: `out/1051-coordinator-symphony-aligned-control-action-preflight-extraction/manual/<pending>/13-override-notes.md`.
- [ ] Manual mock control-action preflight artifact captured. Evidence: `out/1051-coordinator-symphony-aligned-control-action-preflight-extraction/manual/<pending>/11-manual-control-action-preflight.json`.
- [ ] Elegance review completed. Evidence: `out/1051-coordinator-symphony-aligned-control-action-preflight-extraction/manual/<pending>/12-elegance-review.md`.
