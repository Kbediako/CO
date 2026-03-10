# Task Checklist - 1106-coordinator-symphony-aligned-control-server-live-instance-host-shell-extraction

- MCP Task ID: `1106-coordinator-symphony-aligned-control-server-live-instance-host-shell-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-control-server-live-instance-host-shell-extraction.md`
- TECH_SPEC: `tasks/specs/1106-coordinator-symphony-aligned-control-server-live-instance-host-shell-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-control-server-live-instance-host-shell-extraction.md`

> This lane follows `1105` by extracting only the remaining pending ready-instance host shell from `ControlServer.start()` while leaving request-shell binding and ready-instance startup sequencing on their existing seams.

## Foundation

- [ ] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-control-server-live-instance-host-shell-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-control-server-live-instance-host-shell-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-control-server-live-instance-host-shell-extraction.md`, `tasks/specs/1106-coordinator-symphony-aligned-control-server-live-instance-host-shell-extraction.md`, `tasks/tasks-1106-coordinator-symphony-aligned-control-server-live-instance-host-shell-extraction.md`, `.agent/task/1106-coordinator-symphony-aligned-control-server-live-instance-host-shell-extraction.md`.
- [ ] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1106-control-server-live-instance-host-shell-extraction-deliberation.md`.

## Shared Registry + Review Handoff

- [ ] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [ ] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1106-coordinator-symphony-aligned-control-server-live-instance-host-shell-extraction.md`, `docs/findings/1106-control-server-live-instance-host-shell-extraction-deliberation.md`.
- [ ] docs-review approval/override captured for registered `1106`. Evidence: `out/1106-coordinator-symphony-aligned-control-server-live-instance-host-shell-extraction/manual/TODO-docs-first/05-docs-review-override.md`.

## Control Server Live-Instance Host Shell

- [ ] `ControlServer.start()` delegates the pending ready-instance host shell through one same-file private helper that returns the fully started instance. Evidence: `orchestrator/src/cli/control/controlServer.ts`.
- [ ] The helper owns only bound-server creation, pending instance construction, bootstrap attachment wiring, failure-close wiring, and the ready-instance startup handoff for that same instance. Evidence: `orchestrator/src/cli/control/controlServer.ts`, `orchestrator/src/cli/control/controlServerRequestShellBinding.ts`, `orchestrator/src/cli/control/controlServerReadyInstanceStartup.ts`.
- [ ] Focused regression coverage proves live request-shell reads and fail-closed cleanup over the extracted host-shell seam without reopening downstream request or startup behavior. Evidence: `orchestrator/tests/ControlServer.test.ts`, `out/1106-coordinator-symphony-aligned-control-server-live-instance-host-shell-extraction/manual/TODO-closeout/05-targeted-tests.log`, `out/1106-coordinator-symphony-aligned-control-server-live-instance-host-shell-extraction/manual/TODO-closeout/11-manual-live-instance-host-shell-check.json`.

## Validation + Closeout

- [ ] `node scripts/delegation-guard.mjs`. Evidence: `out/1106-coordinator-symphony-aligned-control-server-live-instance-host-shell-extraction/manual/TODO-closeout/01-delegation-guard.log`.
- [ ] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1106-coordinator-symphony-aligned-control-server-live-instance-host-shell-extraction/manual/TODO-closeout/02-spec-guard.log`.
- [ ] `npm run build`. Evidence: `out/1106-coordinator-symphony-aligned-control-server-live-instance-host-shell-extraction/manual/TODO-closeout/03-build.log`.
- [ ] `npm run lint`. Evidence: `out/1106-coordinator-symphony-aligned-control-server-live-instance-host-shell-extraction/manual/TODO-closeout/04-lint.log`.
- [ ] `npm run test`. Evidence: `out/1106-coordinator-symphony-aligned-control-server-live-instance-host-shell-extraction/manual/TODO-closeout/05-test.log`.
- [ ] `npm run docs:check`. Evidence: `out/1106-coordinator-symphony-aligned-control-server-live-instance-host-shell-extraction/manual/TODO-closeout/06-docs-check.log`.
- [ ] `npm run docs:freshness`. Evidence: `out/1106-coordinator-symphony-aligned-control-server-live-instance-host-shell-extraction/manual/TODO-closeout/07-docs-freshness.log`.
- [ ] `node scripts/diff-budget.mjs`. Evidence: `out/1106-coordinator-symphony-aligned-control-server-live-instance-host-shell-extraction/manual/TODO-closeout/08-diff-budget.log`, `out/1106-coordinator-symphony-aligned-control-server-live-instance-host-shell-extraction/manual/TODO-closeout/13-override-notes.md`.
- [ ] `npm run review`. Evidence: `out/1106-coordinator-symphony-aligned-control-server-live-instance-host-shell-extraction/manual/TODO-closeout/09-review.log`.
- [ ] `npm run pack:smoke`. Evidence: `out/1106-coordinator-symphony-aligned-control-server-live-instance-host-shell-extraction/manual/TODO-closeout/10-pack-smoke.log`.
- [ ] Manual live-instance host-shell evidence captured. Evidence: `out/1106-coordinator-symphony-aligned-control-server-live-instance-host-shell-extraction/manual/TODO-closeout/11-manual-live-instance-host-shell-check.json`.
- [ ] Elegance review completed. Evidence: `out/1106-coordinator-symphony-aligned-control-server-live-instance-host-shell-extraction/manual/TODO-closeout/12-elegance-review.md`.
