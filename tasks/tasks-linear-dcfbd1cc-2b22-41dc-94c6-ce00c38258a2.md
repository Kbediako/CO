# Task Checklist - linear-dcfbd1cc-2b22-41dc-94c6-ce00c38258a2

- Linear Issue: `CO-40` / `dcfbd1cc-2b22-41dc-94c6-ce00c38258a2`
- MCP Task ID: `linear-dcfbd1cc-2b22-41dc-94c6-ce00c38258a2`
- Primary PRD: `docs/PRD-linear-dcfbd1cc-2b22-41dc-94c6-ce00c38258a2.md`
- TECH_SPEC: `tasks/specs/linear-dcfbd1cc-2b22-41dc-94c6-ce00c38258a2.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-dcfbd1cc-2b22-41dc-94c6-ce00c38258a2.md`

## Docs-First
- [x] PRD drafted for the stale merge-handoff reconciliation lane. Evidence: `docs/PRD-linear-dcfbd1cc-2b22-41dc-94c6-ce00c38258a2.md`.
- [x] TECH_SPEC drafted with the narrow terminal-success proof reconciliation seam and regression plan. Evidence: `tasks/specs/linear-dcfbd1cc-2b22-41dc-94c6-ce00c38258a2.md`, `docs/TECH_SPEC-linear-dcfbd1cc-2b22-41dc-94c6-ce00c38258a2.md`.
- [x] ACTION_PLAN drafted for docs-review, implementation, validation, and closeout proof. Evidence: `docs/ACTION_PLAN-linear-dcfbd1cc-2b22-41dc-94c6-ce00c38258a2.md`.
- [x] `tasks/index.json` updated with the new TECH_SPEC entry and review date. Evidence: `tasks/index.json`.
- [x] `docs/TASKS.md` updated with the new lane snapshot. Evidence: `docs/TASKS.md`.
- [x] `docs/docs-freshness-registry.json` updated with the new packet entries. Evidence: `docs/docs-freshness-registry.json`.
- [x] Checklist mirrored to `.agent/task/linear-dcfbd1cc-2b22-41dc-94c6-ce00c38258a2.md`. Evidence: `.agent/task/linear-dcfbd1cc-2b22-41dc-94c6-ce00c38258a2.md`.
- [x] Standalone pre-implementation approval captured in spec notes. Evidence: `tasks/specs/linear-dcfbd1cc-2b22-41dc-94c6-ce00c38258a2.md` `review_notes`.
- [x] docs-review approval captured for `linear-dcfbd1cc-2b22-41dc-94c6-ce00c38258a2`. Evidence: `.runs/linear-dcfbd1cc-2b22-41dc-94c6-ce00c38258a2-co-40-docs-review/cli/2026-03-30T00-51-39-696Z-5b6b4a29/manifest.json`, `review/output.log` (P2 findings fixed in packet).

## Workflow
- [x] Issue moved from `Ready` to the live started state (`In Progress`) before active coding. Evidence: packaged `linear transition --state "In Progress"` succeeded for `CO-40`.
- [x] Exactly one persistent `## Codex Workpad` comment is kept current on the issue. Evidence: packaged `linear upsert-workpad` created comment `5f47c854-2c99-49bf-a858-b0b7cf41a3b0`.
- [x] Workspace was resynced from detached `HEAD` onto a task branch based on `origin/main`. Evidence: `linear/co-40-stale-merge-handoff`.

## Investigation
- [x] Required baseline artifacts for `CO-30` and `CO-38` were reviewed before implementation. Evidence: the issue-linked baseline file set plus `tasks/specs/linear-dcfbd1cc-2b22-41dc-94c6-ce00c38258a2.md`.
- [x] The stale seam was narrowed to provider run discovery and rehydrate logic rather than general Linear write-back or shared-root merge closeout. Evidence: `tasks/specs/linear-dcfbd1cc-2b22-41dc-94c6-ce00c38258a2.md` `review_notes`.
- [x] The current hypothesis is explicit and bounded: terminal-success proof is not yet authoritative against stale `in_progress` manifests. Evidence: `docs/TECH_SPEC-linear-dcfbd1cc-2b22-41dc-94c6-ce00c38258a2.md`.

## Implementation
- [x] Terminal successful provider-worker proof reclassifies stale `in_progress` run discovery when the proof is at least as fresh as the manifest. Evidence: `orchestrator/src/cli/control/providerIssueHandoff.ts`.
- [x] Rehydrate/accepted-issue handling no longer persists stale `running` claims in the successful review-handoff case. Evidence: `orchestrator/src/cli/control/providerIssueHandoff.ts`, `orchestrator/tests/ProviderIssueHandoff.test.ts`.
- [x] Control-host/provider-intake surfaces distinguish prior completed runs from active runs and later merge continuations. Evidence: `orchestrator/src/cli/control/providerIssueHandoff.ts`, `orchestrator/tests/ProviderIssueHandoff.test.ts`.
- [x] Focused regressions added for the `CO-30` / `CO-38` stale merge-handoff class. Evidence: `orchestrator/tests/ProviderIssueHandoff.test.ts`.
- [ ] Closeout proof artifact tied to a real issue/PR merge-handoff path is recorded. Evidence: pending.

## Validation
- [x] `MCP_RUNNER_TASK_ID=linear-dcfbd1cc-2b22-41dc-94c6-ce00c38258a2 node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear child-stream --pipeline docs-review --stream co-40-docs-review --format json`. Evidence: `.runs/linear-dcfbd1cc-2b22-41dc-94c6-ce00c38258a2-co-40-docs-review/cli/2026-03-30T00-51-39-696Z-5b6b4a29/manifest.json`.
- [x] Focused `ProviderIssueHandoff` regression command(s). Evidence: `npm test -- --run orchestrator/tests/ProviderIssueHandoff.test.ts` passed (`143` tests).
- [x] `MCP_RUNNER_TASK_ID=linear-dcfbd1cc-2b22-41dc-94c6-ce00c38258a2 node scripts/delegation-guard.mjs`. Evidence: `Delegation guard: OK (2 subagent manifest(s) found).`
- [x] `MCP_RUNNER_TASK_ID=linear-dcfbd1cc-2b22-41dc-94c6-ce00c38258a2 node scripts/spec-guard.mjs --dry-run`. Evidence: `Spec guard: OK`.
- [x] `MCP_RUNNER_TASK_ID=linear-dcfbd1cc-2b22-41dc-94c6-ce00c38258a2 npm run build`. Evidence: passed.
- [x] `MCP_RUNNER_TASK_ID=linear-dcfbd1cc-2b22-41dc-94c6-ce00c38258a2 npm run lint`. Evidence: passed.
- [x] `MCP_RUNNER_TASK_ID=linear-dcfbd1cc-2b22-41dc-94c6-ce00c38258a2 npm run test`. Evidence: `out/linear-dcfbd1cc-2b22-41dc-94c6-ce00c38258a2/manual/20260330T011232Z-validation-review-fallback.md` (provider-worker env overrides caused the initial false red buckets; the scrubbed-env rerun in `/tmp/co40-clean-validate.nMfW9C` cleared the previously failing files, then hung only in quiet teardown after zero-failure output).
- [x] `MCP_RUNNER_TASK_ID=linear-dcfbd1cc-2b22-41dc-94c6-ce00c38258a2 npm run docs:check`. Evidence: `docs:check: OK`.
- [x] `MCP_RUNNER_TASK_ID=linear-dcfbd1cc-2b22-41dc-94c6-ce00c38258a2 npm run docs:freshness`. Evidence: `docs:freshness OK - 3052 docs, 3062 registry entries`.
- [x] `MCP_RUNNER_TASK_ID=linear-dcfbd1cc-2b22-41dc-94c6-ce00c38258a2 node scripts/diff-budget.mjs`. Evidence: `Diff budget: OK (scope=working-tree, files=9/25, lines=695/1200, +673/-22)`.
- [x] `MCP_RUNNER_TASK_ID=linear-dcfbd1cc-2b22-41dc-94c6-ce00c38258a2 FORCE_CODEX_REVIEW=1 npm run review`. Evidence: `out/linear-dcfbd1cc-2b22-41dc-94c6-ce00c38258a2/manual/20260330T011232Z-validation-review-fallback.md` (wrapper launched, then stalled; manual fallback recorded).
- [x] `MCP_RUNNER_TASK_ID=linear-dcfbd1cc-2b22-41dc-94c6-ce00c38258a2 npm run pack:smoke` if downstream-facing CLI/package/review-wrapper surfaces change. Evidence: `pack:smoke` passed.
- [x] Explicit elegance review recorded before any review handoff. Evidence: `out/linear-dcfbd1cc-2b22-41dc-94c6-ce00c38258a2/manual/20260330T011232Z-validation-review-fallback.md`.
- [x] Out-of-scope env leakage was filed as a same-project follow-up instead of widening CO-40. Evidence: `CO-42` / `aadbe46e-9e5a-4810-b9fb-52afe70d73a3`.

## Handoff
- [x] Workpad refreshed after implementation and immediately before any review or merge handoff. Evidence: packaged `linear upsert-workpad` updated comment `5f47c854-2c99-49bf-a858-b0b7cf41a3b0` with the scrubbed-env validation result, fallback review status, and follow-up reference.
- [ ] PR attached to the Linear issue before review-state transition. Evidence: pending.
- [ ] Latest `origin/main` merged into the branch before review-state transition. Evidence: pending.
- [ ] PR checks green and actionable review feedback handled or explicitly pushed back before review-state transition. Evidence: pending.
- [x] Issue moved only to the correct live review state when coding stops, or kept active until handoff prerequisites are complete. Evidence: issue remains `In Progress` while PR creation, attach, and review drain are still pending.
