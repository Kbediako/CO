# Task Checklist - linear-e1950d32-99a2-4fdc-97c6-400ecacc9cd5

- MCP Task ID: `linear-e1950d32-99a2-4fdc-97c6-400ecacc9cd5`
- Primary PRD: `docs/PRD-linear-e1950d32-99a2-4fdc-97c6-400ecacc9cd5.md`
- TECH_SPEC: `tasks/specs/linear-e1950d32-99a2-4fdc-97c6-400ecacc9cd5.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-e1950d32-99a2-4fdc-97c6-400ecacc9cd5.md`

## Docs-first
- [x] PRD drafted for the `CO-18` terminal provider-worker reconciliation lane. Evidence: `docs/PRD-linear-e1950d32-99a2-4fdc-97c6-400ecacc9cd5.md`.
- [x] TECH_SPEC drafted for the same lane. Evidence: `tasks/specs/linear-e1950d32-99a2-4fdc-97c6-400ecacc9cd5.md`, `docs/TECH_SPEC-linear-e1950d32-99a2-4fdc-97c6-400ecacc9cd5.md`.
- [x] ACTION_PLAN drafted for the same lane. Evidence: `docs/ACTION_PLAN-linear-e1950d32-99a2-4fdc-97c6-400ecacc9cd5.md`.
- [x] `tasks/index.json` registers the `CO-18` TECH_SPEC entry. Evidence: `tasks/index.json`.
- [x] `docs/TASKS.md` updated with the `CO-18` snapshot. Evidence: `docs/TASKS.md`.
- [x] Checklist mirrored to `.agent/task/linear-e1950d32-99a2-4fdc-97c6-400ecacc9cd5.md`. Evidence: `.agent/task/linear-e1950d32-99a2-4fdc-97c6-400ecacc9cd5.md`.
- [x] docs-review approved the `CO-18` packet for implementation. Evidence: self-approved by `provider-worker` on 2026-03-24T23:32:36Z after `docs-review` succeeded at `/Users/kbediako/Code/CO/.runs/linear-e1950d32-99a2-4fdc-97c6-400ecacc9cd5/cli/2026-03-24T23-27-44-639Z-c2876226/manifest.json`; no blocking review comments remained before implementation. Mirror: `tasks/specs/linear-e1950d32-99a2-4fdc-97c6-400ecacc9cd5.md` `review_notes`.

## Investigation
- [x] Live Linear workflow states and current issue state were rechecked before transition, and the issue was moved from `Ready` to `In Progress`. Evidence: `node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear issue-context --issue-id e1950d32-99a2-4fdc-97c6-400ecacc9cd5`, `node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear transition --issue-id e1950d32-99a2-4fdc-97c6-400ecacc9cd5 --state "In Progress"`.
- [x] Baseline audit captured the failed `CO-16` manifest/proof pair, the current intake snapshot, and the relevant provider/control runtime seams. Evidence: `out/linear-e1950d32-99a2-4fdc-97c6-400ecacc9cd5/manual/20260325T000000Z-baseline-audit.md`.
- [x] Required provider/control runtime seams and the local Symphony baseline were audited before implementation. Evidence: `orchestrator/src/cli/control/providerIssueHandoff.ts`, `orchestrator/src/cli/providerLinearWorkerRunner.ts`, `orchestrator/src/cli/control/controlRuntime.ts`, `/Users/kbediako/Code/symphony/SPEC.md`.
- [x] Delegation override was explicitly recorded for this worker run because subagent spawning is unavailable in-session. Evidence: `tasks/specs/linear-e1950d32-99a2-4fdc-97c6-400ecacc9cd5.md`.

## Implementation
- [x] Make terminal provider-worker failure authoritative for provider-intake reconciliation without leaving stale `running` ownership. Evidence: `orchestrator/src/cli/control/providerIssueHandoff.ts`, `orchestrator/src/cli/control/controlRuntime.ts`.
- [x] Refresh stale provider issue metadata during failure reconciliation and rehydrate/refresh reads. Evidence: `orchestrator/src/cli/control/providerIssueHandoff.ts`.
- [x] Add a truthful failure-side Linear/workpad update path for terminal worker failures. Evidence: `orchestrator/src/cli/providerLinearWorkerRunner.ts`.
- [x] Add focused regressions across `ProviderIssueHandoff`, `ProviderLinearWorkerRunner`, and `ControlRuntime`. Evidence: `orchestrator/tests/ProviderIssueHandoff.test.ts`, `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`, `orchestrator/tests/ControlRuntime.test.ts`.

## Validation
- [x] `DELEGATION_GUARD_OVERRIDE_REASON="Provider worker run could not delegate because spawn_agent is unavailable without explicit user authorization in this session." node scripts/delegation-guard.mjs`. Evidence: passed locally on 2026-03-25.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: passed locally on 2026-03-25.
- [x] `npm run build`. Evidence: passed locally on 2026-03-25.
- [x] `npm run lint`. Evidence: passed locally on 2026-03-25.
- [ ] `npm run test`. Evidence: the env-scrubbed local rerun on 2026-03-25 completed without visible failures, but the provider-worker shell hit the known quiet-tail after completion and the required GitHub `Core Lane` run for PR `#296` on head `af5affcc2c98623639bfd53e96c75366dabd8878` is still pending, so terminal green is not recorded yet.
- [x] `npm run docs:check`. Evidence: passed locally on 2026-03-25.
- [x] `npm run docs:freshness`. Evidence: passed locally on 2026-03-25.
- [x] `DIFF_BUDGET_OVERRIDE_REASON="Docs-first packet plus bounded provider failure reconciliation and regressions for CO-18 exceed the review budget by 18 lines; splitting would separate required spec evidence from the implementation it governs." node scripts/diff-budget.mjs`. Evidence: passed locally on 2026-03-25.
- [x] `DIFF_BUDGET_OVERRIDE_REASON="Docs-first packet plus bounded provider failure reconciliation and regressions for CO-18 exceed the review budget by 18 lines; splitting would separate required spec evidence from the implementation it governs." npm run review -- --manifest /Users/kbediako/Code/CO/.runs/linear-e1950d32-99a2-4fdc-97c6-400ecacc9cd5/cli/2026-03-24T23-27-44-639Z-c2876226/manifest.json`. Evidence: non-interactive manifest-backed handoff prompt emitted on 2026-03-25.
- [x] `env -i PATH="$PATH" HOME="$HOME" TMPDIR="${TMPDIR:-/tmp}" npm run pack:smoke`. Evidence: passed locally on 2026-03-25.

## Delivery
- [x] Replacement PR `#296` is open and attached to Linear after the required `Rework` reset. Evidence: `https://github.com/Kbediako/CO/pull/296`, `node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear attach-pr --issue-id e1950d32-99a2-4fdc-97c6-400ecacc9cd5 --url https://github.com/Kbediako/CO/pull/296 --title "fix: reconcile failed provider-worker intake state"`.
- [ ] Handle actionable PR feedback and wait for required checks to reach terminal green before moving to `In Review`. Evidence: CodeRabbit requested changes on 2026-03-25T04:44:33Z, and GitHub `Core Lane` run `23525089460` for PR `#296` is still pending.
- [ ] Verify unresolved actionable review threads = `0`, merge the latest `origin/main` into the branch just before handoff, refresh the workpad to match current status and risks, and stop coding once the issue reaches `In Review`.
