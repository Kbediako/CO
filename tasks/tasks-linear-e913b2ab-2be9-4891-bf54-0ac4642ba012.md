# Task Checklist - linear-e913b2ab-2be9-4891-bf54-0ac4642ba012

- MCP Task ID: `linear-e913b2ab-2be9-4891-bf54-0ac4642ba012`
- Primary PRD: `docs/PRD-linear-e913b2ab-2be9-4891-bf54-0ac4642ba012.md`
- TECH_SPEC: `tasks/specs/linear-e913b2ab-2be9-4891-bf54-0ac4642ba012.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-e913b2ab-2be9-4891-bf54-0ac4642ba012.md`

## Docs-first
- [x] PRD drafted for the `CO-8` runtime-proof parity lane. Evidence: `docs/PRD-linear-e913b2ab-2be9-4891-bf54-0ac4642ba012.md`.
- [x] TECH_SPEC drafted for the same lane. Evidence: `tasks/specs/linear-e913b2ab-2be9-4891-bf54-0ac4642ba012.md`, `docs/TECH_SPEC-linear-e913b2ab-2be9-4891-bf54-0ac4642ba012.md`.
- [x] ACTION_PLAN drafted for the same lane. Evidence: `docs/ACTION_PLAN-linear-e913b2ab-2be9-4891-bf54-0ac4642ba012.md`.
- [x] `tasks/index.json` registers the `CO-8` TECH_SPEC entry. Evidence: `tasks/index.json`.
- [x] `docs/TASKS.md` updated with the `CO-8` snapshot. Evidence: `docs/TASKS.md`.
- [x] Checklist mirrored to `.agent/task/linear-e913b2ab-2be9-4891-bf54-0ac4642ba012.md`. Evidence: `.agent/task/linear-e913b2ab-2be9-4891-bf54-0ac4642ba012.md`.
- [x] docs-review approves the `CO-8` packet for implementation. Evidence: `.runs/linear-e913b2ab-2be9-4891-bf54-0ac4642ba012/cli/2026-03-27T04-05-05-788Z-e1ccb243/manifest.json`.

## Investigation
- [x] Live Linear workflow states and current issue state were rechecked before transition, and the issue was moved from `Ready` to `In Progress`. Evidence: `node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear issue-context --issue-id e913b2ab-2be9-4891-bf54-0ac4642ba012 --format json`, `node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear transition --issue-id e913b2ab-2be9-4891-bf54-0ac4642ba012 --state "In Progress" --format json`.
- [x] Workspace sync was reset onto current `origin/main` before edits on a fresh issue branch. Evidence: `git switch -c linear/co-8-app-runtime-proof-capture-pr-media origin/main`, current `HEAD` `1f768038ec`.
- [x] Baseline audit captured the current Symphony runtime-proof requirement and the matching CO gap. Evidence: `out/linear-e913b2ab-2be9-4891-bf54-0ac4642ba012/manual/20260327T035157Z-baseline-audit.md`.
- [x] Delegation override was explicitly recorded for this worker run because subagent spawning is unavailable in-session. Evidence: `tasks/specs/linear-e913b2ab-2be9-4891-bf54-0ac4642ba012.md`.

## Implementation
- [x] Add a bounded worker-visible runtime-proof helper and policy contract. Evidence: `orchestrator/src/cli/control/providerLinearRuntimeProof.ts`, `orchestrator/src/cli/linearCliShell.ts`, `bin/codex-orchestrator.ts`.
- [x] Add permit-gated screenshot, external-link, and video-mode handling with fail-closed behavior. Evidence: `scripts/design/pipeline/permit.js`, `scripts/design/pipeline/permit.d.ts`, `compliance/permit.json`, `compliance/permit.example.json`, `orchestrator/src/cli/control/providerLinearRuntimeProof.ts`.
- [x] Update provider-worker prompt/help/skill docs so app-touching lanes discover the helper before review handoff. Evidence: `orchestrator/src/cli/providerLinearWorkerRunner.ts`, `skills/linear/SKILL.md`, `docs/README.md`.
- [x] Add focused regressions for allowed, blocked, video-disabled, nested-cwd repo-root resolution, and loopback-url rejection behavior. Evidence: `orchestrator/tests/ProviderLinearRuntimeProof.test.ts`, `orchestrator/tests/LinearCliShell.test.ts`, `orchestrator/tests/ProviderLinearWorkflowAudit.test.ts`, `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`, `tests/designToolkit/permit.test.ts`, `tests/designToolkit/permit.spec.ts`, `tests/linear-cli-help.spec.ts`.

## Validation
- [x] `DELEGATION_GUARD_OVERRIDE_REASON="Provider worker run could not delegate because spawn_agent is unavailable without explicit user authorization in this session." node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" start docs-review --format json --no-interactive --task linear-e913b2ab-2be9-4891-bf54-0ac4642ba012`. Evidence: `.runs/linear-e913b2ab-2be9-4891-bf54-0ac4642ba012/cli/2026-03-27T04-05-05-788Z-e1ccb243/manifest.json`.
- [x] `DELEGATION_GUARD_OVERRIDE_REASON="Provider worker run could not delegate because spawn_agent is unavailable without explicit user authorization in this session." node scripts/delegation-guard.mjs`. Evidence: explicit override accepted during the worker run; summary recorded in `out/linear-e913b2ab-2be9-4891-bf54-0ac4642ba012/manual/20260327T045053Z-review-closeout.md`.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/linear-e913b2ab-2be9-4891-bf54-0ac4642ba012/manual/20260327T045053Z-review-closeout.md`.
- [x] `npm run build`. Evidence: `out/linear-e913b2ab-2be9-4891-bf54-0ac4642ba012/manual/20260327T045053Z-review-closeout.md`.
- [x] `npm run lint`. Evidence: `out/linear-e913b2ab-2be9-4891-bf54-0ac4642ba012/manual/20260327T045053Z-review-closeout.md`.
- [x] `npm run test`. Evidence: `out/linear-e913b2ab-2be9-4891-bf54-0ac4642ba012/manual/20260327T045053Z-review-closeout.md`.
- [x] `npm run docs:check`. Evidence: `out/linear-e913b2ab-2be9-4891-bf54-0ac4642ba012/manual/20260327T045053Z-review-closeout.md`.
- [x] `npm run docs:freshness`. Evidence: `out/linear-e913b2ab-2be9-4891-bf54-0ac4642ba012/manual/20260327T045053Z-review-closeout.md`.
- [x] `node scripts/diff-budget.mjs`. Evidence: diff-budget override accepted; summary recorded in `out/linear-e913b2ab-2be9-4891-bf54-0ac4642ba012/manual/20260327T045053Z-review-closeout.md`.
- [x] `npm run review`. Evidence: initial wrapper finding and post-fix fallback review/elegance summary recorded in `out/linear-e913b2ab-2be9-4891-bf54-0ac4642ba012/manual/20260327T045053Z-review-closeout.md`, with the original concrete finding captured in `.runs/linear-e913b2ab-2be9-4891-bf54-0ac4642ba012/cli/2026-03-27T03-44-57-124Z-44e01dac/review/output.log`.
- [x] `npm run pack:smoke`. Evidence: `out/linear-e913b2ab-2be9-4891-bf54-0ac4642ba012/manual/20260327T045053Z-review-closeout.md`.

## Delivery
- [ ] Open PR for `CO-8`, attach it to Linear, handle feedback, and wait for required checks to reach terminal green.
- [ ] Verify unresolved actionable review threads = `0` or record a waiver with evidence in PR review threads/task notes before moving to `In Review`.
- [ ] Refresh the workpad with the runtime-proof handoff status and stop coding once the issue reaches `In Review`.
