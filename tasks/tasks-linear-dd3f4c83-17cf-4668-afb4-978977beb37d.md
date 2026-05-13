# Task Checklist - linear-dd3f4c83-17cf-4668-afb4-978977beb37d

- Linear Issue: `CO-141` / `dd3f4c83-17cf-4668-afb4-978977beb37d`
- MCP Task ID: `linear-dd3f4c83-17cf-4668-afb4-978977beb37d`
- Primary PRD: `docs/PRD-linear-dd3f4c83-17cf-4668-afb4-978977beb37d.md`
- TECH_SPEC: `tasks/specs/linear-dd3f4c83-17cf-4668-afb4-978977beb37d.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-dd3f4c83-17cf-4668-afb4-978977beb37d.md`

## Docs-First
- [x] PRD drafted for the rollout/adoption lane. Evidence: `docs/PRD-linear-dd3f4c83-17cf-4668-afb4-978977beb37d.md`.
- [x] TECH_SPEC drafted with the bounded rollout truth and migration seams. Evidence: `tasks/specs/linear-dd3f4c83-17cf-4668-afb4-978977beb37d.md`, `docs/TECH_SPEC-linear-dd3f4c83-17cf-4668-afb4-978977beb37d.md`.
- [x] ACTION_PLAN drafted for docs-review, implementation, validation, and handoff. Evidence: `docs/ACTION_PLAN-linear-dd3f4c83-17cf-4668-afb4-978977beb37d.md`.
- [x] `tasks/index.json` updated with the new TECH_SPEC entry and review date. Evidence: `tasks/index.json`.
- [x] `docs/TASKS.md` updated with the new lane snapshot. Evidence: `docs/TASKS.md`.
- [x] `docs/docs-freshness-registry.json` updated with the new packet entries. Evidence: `docs/docs-freshness-registry.json`.
- [x] Checklist mirrored to `.agent/task/linear-dd3f4c83-17cf-4668-afb4-978977beb37d.md`. Evidence: `.agent/task/linear-dd3f4c83-17cf-4668-afb4-978977beb37d.md`.
- [x] Pre-implementation issue-quality review is captured in the spec packet. Evidence: `tasks/specs/linear-dd3f4c83-17cf-4668-afb4-978977beb37d.md`.
- [x] docs-review approval captured for `linear-dd3f4c83-17cf-4668-afb4-978977beb37d`. Evidence: child-stream manifest `.runs/linear-dd3f4c83-17cf-4668-afb4-978977beb37d-co-141-docs-review/cli/2026-04-10T07-01-12-520Z-3922c49d/manifest.json` and fallback note `out/linear-dd3f4c83-17cf-4668-afb4-978977beb37d/manual/20260410T070112Z-docs-review-fallback.md`.

## Workflow
- [x] Issue moved from `Ready` to the live started state (`In Progress`) before active coding. Evidence: `.runs/linear-dd3f4c83-17cf-4668-afb4-978977beb37d/cli/2026-04-10T06-49-38-340Z-deafd572/provider-linear-worker-linear-audit.jsonl`.
- [x] The required turn-level parallelization decision was recorded for this turn. Evidence: `.runs/linear-dd3f4c83-17cf-4668-afb4-978977beb37d/cli/2026-04-10T06-48-56-951Z-e7d4046e/provider-linear-worker-linear-audit.jsonl`.
- [x] Exactly one persistent `## Codex Workpad` comment is kept current on the issue. Evidence: Linear workpad comment `e3f6574d-55ef-4d92-9b71-5800621361f6`, local source `out/linear-dd3f4c83-17cf-4668-afb4-978977beb37d/manual/workpad.md`.

## Investigation
- [x] Verify the current source, built artifact, and supported operator entrypoint all expose the same supervision command surface. Evidence: `bin/codex-orchestrator.ts`, `orchestrator/src/cli/control/controlHostSupervision.ts`, `orchestrator/src/cli/controlHostSupervisionCliShell.ts`, `out/linear-dd3f4c83-17cf-4668-afb4-978977beb37d/manual/before-global-status.stderr.txt`, `out/linear-dd3f4c83-17cf-4668-afb4-978977beb37d/manual/final-managed-status.json`, `out/linear-dd3f4c83-17cf-4668-afb4-978977beb37d/manual/20260410T075205Z-validation-summary.md`.
- [x] Verify the legacy baseline on this host: LaunchAgent payload, active process lineage, and stale operator command surface on `PATH`. Evidence: `out/linear-dd3f4c83-17cf-4668-afb4-978977beb37d/manual/before-global-status.stderr.txt`, `out/linear-dd3f4c83-17cf-4668-afb4-978977beb37d/manual/before-launchagent-plutil.txt`, `out/linear-dd3f4c83-17cf-4668-afb4-978977beb37d/manual/before-process-lineage.txt`.
- [x] Narrow the rollout gap to the smallest code/docs seam needed for truthful migration and status. Evidence: `orchestrator/src/cli/control/controlHostSupervision.ts`, `orchestrator/src/cli/controlHostSupervisionCliShell.ts`, `orchestrator/tests/ControlHostSupervision.test.ts`, `docs/public/provider-onboarding.md`.

## Implementation
- [x] `control-host supervise status` distinguishes legacy shim rollout from packaged rollout and reports the active path truthfully. Evidence: `orchestrator/src/cli/controlHostSupervisionCliShell.ts`, `out/linear-dd3f4c83-17cf-4668-afb4-978977beb37d/manual/final-managed-status.json`, `out/linear-dd3f4c83-17cf-4668-afb4-978977beb37d/manual/20260410T075205Z-validation-summary.md`.
- [x] The canonical rollout or install path migrates the legacy shim-backed LaunchAgent to managed supervision artifacts without manual plist edits. Evidence: `orchestrator/src/cli/control/controlHostSupervision.ts`, `out/linear-dd3f4c83-17cf-4668-afb4-978977beb37d/manual/reinstall-managed-output.json`, `out/linear-dd3f4c83-17cf-4668-afb4-978977beb37d/manual/final-launchctl-print.txt`.
- [x] After rollout or restart, the active root host is launched via the managed supervision path instead of the legacy shim. Evidence: `out/linear-dd3f4c83-17cf-4668-afb4-978977beb37d/manual/final-managed-status.json`, `out/linear-dd3f4c83-17cf-4668-afb4-978977beb37d/manual/final-launchctl-print.txt`, `out/linear-dd3f4c83-17cf-4668-afb4-978977beb37d/manual/final-ps-lineage.txt`.
- [x] Operator-facing docs describe the upgrade path from a legacy shim install. Evidence: `docs/public/provider-onboarding.md`.

## Validation
- [x] `MCP_RUNNER_TASK_ID=linear-dd3f4c83-17cf-4668-afb4-978977beb37d "/opt/homebrew/Cellar/node/25.2.1/bin/node" "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear child-stream --pipeline docs-review --stream co-141-docs-review --format json`. Evidence: child-stream manifest `.runs/linear-dd3f4c83-17cf-4668-afb4-978977beb37d-co-141-docs-review/cli/2026-04-10T07-01-12-520Z-3922c49d/manifest.json`, fallback note `out/linear-dd3f4c83-17cf-4668-afb4-978977beb37d/manual/20260410T070112Z-docs-review-fallback.md`.
- [x] Focused rollout classification and migration tests pass. Evidence: `orchestrator/tests/ControlHostSupervision.test.ts`, `out/linear-dd3f4c83-17cf-4668-afb4-978977beb37d/manual/20260410T075205Z-validation-summary.md`.
- [x] Host-level before or after verification for command surface, launchd truth, process lineage, and managed config/state passes. Evidence: `out/linear-dd3f4c83-17cf-4668-afb4-978977beb37d/manual/before-global-status.stderr.txt`, `out/linear-dd3f4c83-17cf-4668-afb4-978977beb37d/manual/before-launchagent-plutil.txt`, `out/linear-dd3f4c83-17cf-4668-afb4-978977beb37d/manual/before-process-lineage.txt`, `out/linear-dd3f4c83-17cf-4668-afb4-978977beb37d/manual/final-managed-status.json`, `out/linear-dd3f4c83-17cf-4668-afb4-978977beb37d/manual/final-launchctl-print.txt`, `out/linear-dd3f4c83-17cf-4668-afb4-978977beb37d/manual/final-ps-lineage.txt`.
- [x] `MCP_RUNNER_TASK_ID=linear-dd3f4c83-17cf-4668-afb4-978977beb37d node scripts/delegation-guard.mjs`. Evidence: `out/linear-dd3f4c83-17cf-4668-afb4-978977beb37d/manual/20260410T075205Z-validation-summary.md`.
- [x] `MCP_RUNNER_TASK_ID=linear-dd3f4c83-17cf-4668-afb4-978977beb37d node scripts/spec-guard.mjs --dry-run`. Evidence: `out/linear-dd3f4c83-17cf-4668-afb4-978977beb37d/manual/20260410T075205Z-validation-summary.md`.
- [x] `MCP_RUNNER_TASK_ID=linear-dd3f4c83-17cf-4668-afb4-978977beb37d npm run build`. Evidence: `out/linear-dd3f4c83-17cf-4668-afb4-978977beb37d/manual/20260410T075205Z-validation-summary.md`.
- [x] `MCP_RUNNER_TASK_ID=linear-dd3f4c83-17cf-4668-afb4-978977beb37d npm run lint`. Evidence: `out/linear-dd3f4c83-17cf-4668-afb4-978977beb37d/manual/20260410T075205Z-validation-summary.md`.
- [x] `MCP_RUNNER_TASK_ID=linear-dd3f4c83-17cf-4668-afb4-978977beb37d npm run test`. Evidence: `out/linear-dd3f4c83-17cf-4668-afb4-978977beb37d/manual/20260410T075205Z-validation-summary.md`.
- [x] `MCP_RUNNER_TASK_ID=linear-dd3f4c83-17cf-4668-afb4-978977beb37d npm run docs:check`. Evidence: `out/linear-dd3f4c83-17cf-4668-afb4-978977beb37d/manual/20260410T075205Z-validation-summary.md`.
- [x] `MCP_RUNNER_TASK_ID=linear-dd3f4c83-17cf-4668-afb4-978977beb37d npm run docs:freshness`. Evidence: `out/linear-dd3f4c83-17cf-4668-afb4-978977beb37d/manual/20260410T075205Z-validation-summary.md`.
- [x] `MCP_RUNNER_TASK_ID=linear-dd3f4c83-17cf-4668-afb4-978977beb37d node scripts/diff-budget.mjs`. Evidence: `out/linear-dd3f4c83-17cf-4668-afb4-978977beb37d/manual/20260410T075205Z-validation-summary.md`.
- [x] `MCP_RUNNER_TASK_ID=linear-dd3f4c83-17cf-4668-afb4-978977beb37d FORCE_CODEX_REVIEW=1 npm run review`. Evidence: `.runs/linear-dd3f4c83-17cf-4668-afb4-978977beb37d/cli/2026-04-10T06-49-38-340Z-deafd572/review/telemetry.json`, fallback note `out/linear-dd3f4c83-17cf-4668-afb4-978977beb37d/manual/20260410T073702Z-review-fallback.md`.
- [x] `MCP_RUNNER_TASK_ID=linear-dd3f4c83-17cf-4668-afb4-978977beb37d npm run pack:smoke` when downstream CLI packaging or entrypoint behavior changes. Evidence: `out/linear-dd3f4c83-17cf-4668-afb4-978977beb37d/manual/20260410T075205Z-validation-summary.md`.
- [x] Explicit elegance review recorded before any review handoff. Evidence: `out/linear-dd3f4c83-17cf-4668-afb4-978977beb37d/manual/20260410T073702Z-review-fallback.md`.

## Handoff
- [ ] Workpad refreshed after docs, after implementation, and immediately before any review or merge handoff. Evidence: local source `out/linear-dd3f4c83-17cf-4668-afb4-978977beb37d/manual/workpad.md` is current, but the Linear upsert retry is still blocked by the shared-budget cooldown until approximately `2026-04-10T08:06:28Z`.
- [ ] PR attached to the Linear issue before review-state transition. Evidence: GitHub PR `#413` is open, but the Linear attach helper cannot be retried until the shared-budget cooldown clears.
- [ ] Latest `origin/main` merged into the branch before review-state transition. Evidence: `PR #413` currently targets `main` at `8b64f436f801a616d770af0011867811f9491a93`; recheck and merge immediately before the review-state transition.
- [ ] PR checks green and actionable review feedback handled or explicitly pushed back before review-state transition. Evidence: GitHub feedback sweep found only a non-actionable CodeRabbit rate-limit comment, but `PR #413` still has `Core Lane` in progress.
- [x] Issue remains active until review handoff prerequisites are complete. Evidence: `.runs/linear-dd3f4c83-17cf-4668-afb4-978977beb37d/cli/2026-04-10T06-49-38-340Z-deafd572/provider-linear-worker-linear-audit.jsonl`.
