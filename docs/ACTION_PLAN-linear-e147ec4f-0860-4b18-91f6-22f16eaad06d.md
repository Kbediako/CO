# ACTION_PLAN - CO Add Symphony-Style Follow-Up Issue Automation

## Added by Bootstrap (refresh as needed)

## Traceability
- Linear issue: `CO-4` / `e147ec4f-0860-4b18-91f6-22f16eaad06d`
- Linear URL: https://linear.app/asabeko/issue/CO-4/co-add-symphony-style-follow-up-issue-automation

## Summary
- Goal: finish `CO-4` by adding Symphony-style same-project follow-up issue creation to CO's worker-visible Linear tooling without widening provider authority.
- Scope: docs-first packet, single persistent workpad, pre-implementation docs-review, bounded facade/CLI/audit/prompt updates, focused tests, required validation, and normal PR/review handoff.
- Assumptions:
  - the live CO team exposes `Backlog` and `In Review`
  - follow-up issue creation remains a worker-owned helper operation rather than provider-side reconciliation behavior
  - the top-level validation lane can rely on a manifest-backed child diagnostics stream for delegation evidence, while any in-session collab review remains read-only

## Milestones & Sequencing
1) Register the docs-first packet for `linear-e147ec4f-0860-4b18-91f6-22f16eaad06d`, update `tasks/index.json`, update `docs/TASKS.md`, update freshness registry entries, create the baseline audit note, and bootstrap the single Linear workpad.
2) Capture delegation evidence via a bounded child stream, then run docs-review for the top-level task without the stale "spawn unavailable" override.
3) Extend the provider Linear workflow facade with a `create-follow-up` operation that:
   - resolves the current issue context
   - fails closed when project context or `Backlog` is missing
   - creates the new issue in the same team/project in `Backlog`
   - creates `related` and optional `blocks` relations
   - returns created issue metadata and truthful partial-failure details
4) Extend the CLI shell, audit trail, worker prompt, and `skills/linear/SKILL.md` to expose the new helper cleanly.
5) Add focused regression coverage for facade success/failure paths and CLI routing/audit behavior.
6) Run the required validation sequence, refresh docs/workpad, and only move the issue to review if code, feedback, merge-from-main, and PR checks all satisfy the workflow bar.

## Dependencies
- `/Users/kbediako/Code/symphony/SPEC.md`
- `/Users/kbediako/Code/symphony/elixir/README.md`
- `/Users/kbediako/Code/symphony/elixir/WORKFLOW.md`
- `orchestrator/src/cli/control/providerLinearWorkflowFacade.ts`
- `orchestrator/src/cli/linearCliShell.ts`
- `orchestrator/src/cli/control/providerLinearWorkflowAudit.ts`
- `orchestrator/src/cli/providerLinearWorkerRunner.ts`
- `skills/linear/SKILL.md`
- `orchestrator/tests/ProviderLinearWorkflowFacade.test.ts`
- `orchestrator/tests/LinearCliShell.test.ts`

## Validation
- Checks / tests:
  - `MCP_RUNNER_TASK_ID=linear-e147ec4f-0860-4b18-91f6-22f16eaad06d node dist/bin/codex-orchestrator.js start docs-review --format json --no-interactive --task linear-e147ec4f-0860-4b18-91f6-22f16eaad06d`
  - `MCP_RUNNER_TASK_ID=linear-e147ec4f-0860-4b18-91f6-22f16eaad06d node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `node scripts/diff-budget.mjs`
  - `npm run review`
  - `npm run pack:smoke`
- Rollback plan:
  - revert the new `create-follow-up` surface if it breaks existing Linear helper operations or weakens scoped creation semantics
  - keep the issue active until either the implementation is green or a truthful blocker is recorded in the workpad

## Risks & Mitigations
- Risk: the new helper silently creates issues outside the current scoped project/team.
  - Mitigation: derive team/project from `issue-context`, fail closed on missing project, and ignore arbitrary creation overrides.
- Risk: blocker relation direction is encoded backwards.
  - Mitigation: align with the existing `inverseRelations(type=blocks)` blocked-by read model and cover it with focused tests.
- Risk: relation creation can fail after issue creation, leaving an orphaned but real issue.
  - Mitigation: return created-issue metadata in the failure payload and cover the partial-failure contract explicitly in tests.

## Approvals
- Reviewer: Pending docs-review
- Date: 2026-03-25

## Manifest Evidence
- Baseline audit: `out/linear-e147ec4f-0860-4b18-91f6-22f16eaad06d/manual/20260325T070431Z-baseline-audit.md`
- Delegated diagnostics child stream: `.runs/linear-e147ec4f-0860-4b18-91f6-22f16eaad06d-guard/cli/2026-03-25T07-53-02-243Z-f7c8d97d/manifest.json`
