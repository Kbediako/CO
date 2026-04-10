# Task Checklist - linear-255030bf-bdda-4594-b503-28639a98b9da

- Linear Issue: `CO-144` / `255030bf-bdda-4594-b503-28639a98b9da`
- MCP Task ID: `linear-255030bf-bdda-4594-b503-28639a98b9da`
- Primary PRD: `docs/PRD-linear-255030bf-bdda-4594-b503-28639a98b9da.md`
- TECH_SPEC: `tasks/specs/linear-255030bf-bdda-4594-b503-28639a98b9da.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-255030bf-bdda-4594-b503-28639a98b9da.md`

## Docs-First
- [x] PRD drafted for the webhook-first targeted reconcile lane. Evidence: `docs/PRD-linear-255030bf-bdda-4594-b503-28639a98b9da.md`.
- [x] TECH_SPEC drafted with the targeted reconcile, bounded discovery, and slow full-sweep contract. Evidence: `tasks/specs/linear-255030bf-bdda-4594-b503-28639a98b9da.md`, `docs/TECH_SPEC-linear-255030bf-bdda-4594-b503-28639a98b9da.md`.
- [x] ACTION_PLAN drafted for docs-review, implementation, validation, and handoff. Evidence: `docs/ACTION_PLAN-linear-255030bf-bdda-4594-b503-28639a98b9da.md`.
- [x] `tasks/index.json` updated with the new TECH_SPEC entry and review date. Evidence: `tasks/index.json`.
- [x] `docs/TASKS.md` updated with the new lane snapshot. Evidence: `docs/TASKS.md`.
- [x] `docs/docs-freshness-registry.json` updated with the new packet entries. Evidence: `docs/docs-freshness-registry.json`.
- [x] Checklist mirrored to `.agent/task/linear-255030bf-bdda-4594-b503-28639a98b9da.md`. Evidence: `.agent/task/linear-255030bf-bdda-4594-b503-28639a98b9da.md`.
- [x] Standalone pre-implementation approval captured in spec notes. Evidence: `tasks/specs/linear-255030bf-bdda-4594-b503-28639a98b9da.md` `review_notes`.
- [x] docs-review approval captured for `linear-255030bf-bdda-4594-b503-28639a98b9da`. Evidence: audited child-stream `.runs/linear-255030bf-bdda-4594-b503-28639a98b9da-co-144-docs-review/cli/2026-04-10T05-40-04-360Z-3844b2a8/manifest.json` plus manual fallback accepted after the duplicate CO-144 freshness-registry block was removed and the rerun failed only on the existing repo-wide stale-doc baseline (`stale docs: 119`; Task Packet stale=85, Task Mirror stale=17, Report Only stale=17).

## Workflow
- [x] Issue moved from `Ready` to the live started state (`In Progress`) before active coding. Evidence: packaged `linear transition --state "In Progress"` succeeded for `CO-144`.
- [x] Exactly one persistent `## Codex Workpad` comment is kept current on the issue. Evidence: packaged `linear upsert-workpad` updated comment `fb158b05-d7b2-4833-ad02-3ed6d3cbadcb` after the shared cooldown window elapsed; the synchronized source body is `out/linear-255030bf-bdda-4594-b503-28639a98b9da/manual/workpad.md`.
- [x] This turn's required parallelization decision was recorded truthfully as serial because the control-host intake split overlaps the same core files. Evidence: packaged `linear parallelization --decision stay_serial --reason overlapping_scope` succeeded for `CO-144`.
- [x] Workspace is on a task branch before repo edits. Evidence: `linear/co-144-webhook-first-targeted-reconcile`.

## Investigation
- [x] The prior poll-owned discovery, restart recovery, active-claim recovery, and recent rate-limit hardening lanes were reviewed before implementation. Evidence: `tasks/specs/1316-coordinator-symphony-poll-owned-discovery-and-recovery.md`, `tasks/specs/1317-coordinator-live-linear-restarted-issue-intake-and-dispatch-consistency.md`, `tasks/specs/1321-coordinator-live-linear-unassigned-active-claim-alignment-and-recovery.md`, `tasks/specs/linear-95f1c334-e623-471e-a013-d7019feed423.md`.
- [x] The current webhook intake, periodic refresh coordinator, provider refresh cycle, and tracked-issue query seams were audited before implementation. Evidence: `orchestrator/src/cli/control/linearWebhookController.ts`, `orchestrator/src/cli/control/controlServerPublicLifecycle.ts`, `orchestrator/src/cli/control/providerIssueHandoff.ts`, `orchestrator/src/cli/control/linearDispatchSource.ts`.
- [x] The likely implementation seam is identified as lifecycle and query splitting rather than provider workflow redesign. Evidence: `docs/PRD-linear-255030bf-bdda-4594-b503-28639a98b9da.md`, `tasks/specs/linear-255030bf-bdda-4594-b503-28639a98b9da.md`.

## Implementation
- [x] Ordinary refresh ticks reconcile existing claims without preloading the full tracked-issue set. Evidence: `orchestrator/src/cli/control/controlServerPublicLifecycle.ts`, `orchestrator/src/cli/control/providerIssueHandoff.ts`, `orchestrator/tests/ControlServerPublicLifecycle.test.ts`.
- [x] Fresh discovery only runs when free dispatch capacity exists and stops after enough eligible candidates are found for remaining global and constrained per-state slots. Evidence: `orchestrator/src/cli/control/providerIssueHandoff.ts`, `orchestrator/src/cli/control/linearDispatchSource.ts`, `orchestrator/tests/ProviderIssueHandoff.test.ts`, `orchestrator/tests/LinearDispatchSource.test.ts`.
- [x] Startup recovery and slower full sweeps still recover missed webhook events and older unchanged ready issues. Evidence: `orchestrator/src/cli/control/controlServerPublicLifecycle.ts`, `orchestrator/tests/ControlServerPublicLifecycle.test.ts`.
- [x] Lean discovery payloads defer richer reads until by-id reconcile or launch time. Evidence: `orchestrator/src/cli/control/linearDispatchSource.ts`, `orchestrator/src/cli/controlHostCliShell.ts`, `orchestrator/tests/LinearDispatchSource.test.ts`.
- [x] Operator-visible budget and next-refresh truth remain correct under the new intake split while tracked-issue request sources now distinguish recovery sweeps from fresh discovery. Evidence: `orchestrator/src/cli/control/controlServerPublicLifecycle.ts`, `orchestrator/src/cli/control/linearDispatchSource.ts`.
- [ ] Before or after request-burn evidence is captured for the later quota decision. Evidence: deterministic local model recorded at `out/linear-255030bf-bdda-4594-b503-28639a98b9da/manual/request-burn-evidence.md`; live shared-budget/header-backed telemetry capture is still pending.

## Validation
- [x] `MCP_RUNNER_TASK_ID=linear-255030bf-bdda-4594-b503-28639a98b9da node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear child-stream --pipeline docs-review --stream co-144-docs-review --format json`. Evidence: `.runs/linear-255030bf-bdda-4594-b503-28639a98b9da-co-144-docs-review/cli/2026-04-10T05-40-04-360Z-3844b2a8/manifest.json`; first run exposed duplicate packet registry entries, rerun passed spec-guard and docs:check, then failed only on the existing repo-wide stale-doc baseline.
- [x] `MCP_RUNNER_TASK_ID=linear-255030bf-bdda-4594-b503-28639a98b9da node scripts/delegation-guard.mjs`. Evidence: passed with `Delegation guard: OK (3 subagent manifest(s) found).`
- [x] `MCP_RUNNER_TASK_ID=linear-255030bf-bdda-4594-b503-28639a98b9da node scripts/spec-guard.mjs --dry-run`. Evidence: passed.
- [x] `MCP_RUNNER_TASK_ID=linear-255030bf-bdda-4594-b503-28639a98b9da npm run build`. Evidence: passed.
- [x] `MCP_RUNNER_TASK_ID=linear-255030bf-bdda-4594-b503-28639a98b9da npm run lint`. Evidence: passed.
- [x] `MCP_RUNNER_TASK_ID=linear-255030bf-bdda-4594-b503-28639a98b9da npm run test`. Evidence: passed with `324` files / `3321` tests green on the full suite after the intake-split fix.
- [x] `MCP_RUNNER_TASK_ID=linear-255030bf-bdda-4594-b503-28639a98b9da npm run docs:check`. Evidence: passed.
- [ ] `MCP_RUNNER_TASK_ID=linear-255030bf-bdda-4594-b503-28639a98b9da npm run docs:freshness`. Evidence: failed only on the standing repo-wide stale baseline (`119` stale docs; Task Packet stale=85, Task Mirror stale=17, Report Only stale=17); the CO-144 packet is absent from the stale-entry set.
- [x] `MCP_RUNNER_TASK_ID=linear-255030bf-bdda-4594-b503-28639a98b9da node scripts/diff-budget.mjs`. Evidence: passed cleanly after compressing the docs packet; the stacked branch delta now reports `1159/1200` lines against `origin/main`.
- [x] `MCP_RUNNER_TASK_ID=linear-255030bf-bdda-4594-b503-28639a98b9da DIFF_BUDGET_OVERRIDE_REASON="..." FORCE_CODEX_REVIEW=1 npm run review -- --manifest .runs/linear-255030bf-bdda-4594-b503-28639a98b9da/cli/2026-04-10T05-24-20-977Z-48d3b690/manifest.json --base origin/main`. Evidence: `.runs/linear-255030bf-bdda-4594-b503-28639a98b9da/cli/2026-04-10T05-24-20-977Z-48d3b690/review/telemetry.json`; the explicit-base rerun reached `review_outcome: failed-boundary` with termination boundary `command-intent` after the reviewer attempted a validation-suite launch, so the wrapper evidence is preserved and classified truthfully rather than treated as a clean review.
- [x] Manual fallback correctness review completed after the wrapper boundary failure. Evidence: focused diff review of `orchestrator/src/cli/control/*.ts`, `orchestrator/src/cli/controlHostCliShell.ts`, and the matching tests found no remaining issues after the dispatch-priority early-stop fix for bounded fresh discovery.
- [x] Explicit elegance/minimality pass recorded after standalone review. Evidence: the final shape keeps one query-mode split, one deferred-discovery hook, and one slow-sweep cadence without widening provider mutation, workpad, or PR helper behavior.
- [x] `MCP_RUNNER_TASK_ID=linear-255030bf-bdda-4594-b503-28639a98b9da npm run pack:smoke`. Evidence: passed after the final code fix.
- [x] `MCP_RUNNER_TASK_ID=linear-255030bf-bdda-4594-b503-28639a98b9da npx vitest run --config vitest.config.core.ts orchestrator/tests/LinearDispatchSource.test.ts orchestrator/tests/ControlServerPublicLifecycle.test.ts orchestrator/tests/ProviderIssueHandoff.test.ts`. Evidence: passed (`241` focused tests green).

## Handoff
- [x] Workpad refreshed after docs, after implementation, and immediately before any review or merge handoff. Evidence: packaged `linear upsert-workpad` updated comment `fb158b05-d7b2-4833-ad02-3ed6d3cbadcb` from `out/linear-255030bf-bdda-4594-b503-28639a98b9da/manual/workpad.md` once the shared cooldown window cleared.
- [x] PR attached to the Linear issue before review-state transition. Evidence: packaged `linear attach-pr` confirmed the existing GitHub attachment `c63a64fc-56f7-4bfb-bd62-266353f08422` for `https://github.com/Kbediako/CO/pull/407`.
- [x] Latest `origin/main` merged into the branch before review-state transition. Evidence: `git fetch origin refs/heads/main:refs/remotes/origin/main` succeeded and `git rev-list --left-right --count origin/main...HEAD` returned `0 2`.
- [ ] PR checks green and actionable review feedback handled or explicitly pushed back before review-state transition. Evidence: pending.
- [x] Issue remains active until review handoff prerequisites are complete. Evidence: issue remains `In Progress`.
