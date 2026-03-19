# Task Checklist - 1304-coordinator-live-linear-tracked-issue-by-id-query-string-contract-fix

- MCP Task ID: `1304-coordinator-live-linear-tracked-issue-by-id-query-string-contract-fix`
- Primary PRD: `docs/PRD-coordinator-live-linear-tracked-issue-by-id-query-string-contract-fix.md`
- TECH_SPEC: `tasks/specs/1304-coordinator-live-linear-tracked-issue-by-id-query-string-contract-fix.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-live-linear-tracked-issue-by-id-query-string-contract-fix.md`

## Docs-First
- [x] PRD drafted for the live Linear issue-by-id query contract bug. Evidence: `docs/PRD-coordinator-live-linear-tracked-issue-by-id-query-string-contract-fix.md`.
- [x] TECH_SPEC drafted with bounded scope, invariants, and live rerun plan. Evidence: `tasks/specs/1304-coordinator-live-linear-tracked-issue-by-id-query-string-contract-fix.md`.
- [x] ACTION_PLAN drafted for the follow-up lane. Evidence: `docs/ACTION_PLAN-coordinator-live-linear-tracked-issue-by-id-query-string-contract-fix.md`.
- [x] Deliberation/findings captured for the bounded follow-up scope. Evidence: `docs/findings/1304-live-linear-tracked-issue-by-id-query-string-contract-fix-deliberation.md`.
- [x] `tasks/index.json` updated with the new TECH_SPEC entry and review date. Evidence: `tasks/index.json`.
- [x] `docs/TASKS.md` updated with the new lane snapshot. Evidence: `docs/TASKS.md`.
- [x] Checklist mirrored to `.agent/task/1304-coordinator-live-linear-tracked-issue-by-id-query-string-contract-fix.md`. Evidence: `.agent/task/1304-coordinator-live-linear-tracked-issue-by-id-query-string-contract-fix.md`.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `.runs/1304-coordinator-live-linear-tracked-issue-by-id-query-string-contract-fix/cli/2026-03-19T11-27-28-598Z-d4b0023c/manifest.json`.
- [x] `npm run docs:check`. Evidence: `.runs/1304-coordinator-live-linear-tracked-issue-by-id-query-string-contract-fix/cli/2026-03-19T11-27-28-598Z-d4b0023c/manifest.json`.
- [x] `npm run docs:freshness`. Evidence: `.runs/1304-coordinator-live-linear-tracked-issue-by-id-query-string-contract-fix/cli/2026-03-19T11-27-28-598Z-d4b0023c/manifest.json`.
- [x] docs-review approval captured for registered `1304`. Evidence: `.runs/1304-coordinator-live-linear-tracked-issue-by-id-query-string-contract-fix/cli/2026-03-19T11-27-28-598Z-d4b0023c/manifest.json`.

## Implementation
- [x] `buildLinearIssueByIdQuery(...)` declares `$issueId: String!` without changing the surrounding exact-issue selection set. Evidence: `orchestrator/src/cli/control/linearDispatchSource.ts`.
- [x] Focused regression coverage locks the exact query declaration and fails if it drifts back to `ID!`. Evidence: `orchestrator/tests/LinearDispatchSource.test.ts`.
- [x] `resolveLiveLinearTrackedIssueById(...)` preserves existing success, scope-mismatch, and not-found behavior outside the query-type correction. Evidence: `orchestrator/tests/LinearDispatchSource.test.ts`.
- [x] Persistent `control-host` rebuilt and restarted on the current provider env. Evidence: `out/1304-coordinator-live-linear-tracked-issue-by-id-query-string-contract-fix/manual/20260319T114341Z-live-query-contract-fix/00-summary.md`.
- [x] Live autonomous intake rerun against `CO-1` / `CO-2` advanced past provider lookup and webhook ingress, recorded provider-intake claims plus mapped child runs, and isolated the next exact blocker as downstream child-run `stage:delegation-guard:failed`. Evidence: `out/1304-coordinator-live-linear-tracked-issue-by-id-query-string-contract-fix/manual/20260319T114341Z-live-query-contract-fix/00-summary.md`, `out/1304-coordinator-live-linear-tracked-issue-by-id-query-string-contract-fix/manual/20260319T114341Z-live-query-contract-fix/13-live-rerun-evidence.md`.

## Validation
- [x] `node scripts/delegation-guard.mjs` with explicit override after the publication truth-sync reused an existing read-only subagent thread because the spawn limit was reached. Evidence: `out/1304-coordinator-live-linear-tracked-issue-by-id-query-string-contract-fix/manual/20260319T114341Z-live-query-contract-fix/01-delegation-guard.log`.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1304-coordinator-live-linear-tracked-issue-by-id-query-string-contract-fix/manual/20260319T114341Z-live-query-contract-fix/02-spec-guard.log`.
- [x] `npm run build`. Evidence: `out/1304-coordinator-live-linear-tracked-issue-by-id-query-string-contract-fix/manual/20260319T114341Z-live-query-contract-fix/03-build.log`.
- [x] `npm run lint`. Evidence: `out/1304-coordinator-live-linear-tracked-issue-by-id-query-string-contract-fix/manual/20260319T114341Z-live-query-contract-fix/04-lint.log`.
- [x] `npm run test`. Evidence: `out/1304-coordinator-live-linear-tracked-issue-by-id-query-string-contract-fix/manual/20260319T114341Z-live-query-contract-fix/05-test.log`.
- [x] `npm run docs:check`. Evidence: `out/1304-coordinator-live-linear-tracked-issue-by-id-query-string-contract-fix/manual/20260319T114341Z-live-query-contract-fix/06-docs-check.log`.
- [x] `npm run docs:freshness`. Evidence: `out/1304-coordinator-live-linear-tracked-issue-by-id-query-string-contract-fix/manual/20260319T114341Z-live-query-contract-fix/07-docs-freshness.log`.
- [x] `node scripts/diff-budget.mjs`. Evidence: `out/1304-coordinator-live-linear-tracked-issue-by-id-query-string-contract-fix/manual/20260319T114341Z-live-query-contract-fix/08-diff-budget.log`.
- [x] `npm run review` non-interactive handoff prompt captured. Evidence: `out/1304-coordinator-live-linear-tracked-issue-by-id-query-string-contract-fix/manual/20260319T114341Z-live-query-contract-fix/09-review.log`.
- [x] `npm run pack:smoke`. Evidence: `out/1304-coordinator-live-linear-tracked-issue-by-id-query-string-contract-fix/manual/20260319T114341Z-live-query-contract-fix/10-pack-smoke.log`.
- [x] Explicit elegance review pass recorded. Evidence: `out/1304-coordinator-live-linear-tracked-issue-by-id-query-string-contract-fix/manual/20260319T114341Z-live-query-contract-fix/12-elegance-review.md`.
- [x] Unresolved actionable review threads verified as `0`, or waiver recorded with evidence, before merge. Evidence: PR `#279` thread audit via `gh api graphql ... reviewThreads ...` on 2026-03-19 after resolving the final CodeRabbit thread.
