# ACTION_PLAN - CO Strengthen Autonomous Issue Understanding and Intent Capture for Follow-Up Work

## Added by Bootstrap (refresh as needed)

## Traceability
- Linear issue: `CO-45` / `3f7dfd9d-e6dc-4e79-bd56-a2786a15c277`
- Linear URL: https://linear.app/asabeko/issue/CO-45/co-strengthen-autonomous-issue-understanding-and-intent-capture-for

## Summary
- Goal: harden the autonomy-facing issue creation and readiness flow so future follow-up issues preserve exact intent and reject nearby wrong interpretations before implementation starts.
- Scope: docs-first packet registration, delegated docs-review, template/guidance changes, `linear create-follow-up` hardening with deterministic traceability, focused tests, required validation, and review-ready closeout.
- Assumptions:
  - the sanctioned autonomy-created follow-up surface is `linear create-follow-up`, so helper changes are the smallest tooling seam that materially improves issue quality
  - docs-first packet drift is part of the problem, so the fix must update templates and readiness guidance, not only worker prompts
  - parity/alignment work is a recurring special case that needs a conditional but explicit matrix, not implicit reviewer inference

## Milestones & Sequencing
1. Register the CO-45 docs-first packet, update `tasks/index.json`, update `docs/TASKS.md`, update `docs/docs-freshness-registry.json`, mirror the checklist to `.agent/task/`, and keep the single Linear workpad current.
2. Run `node dist/bin/codex-orchestrator.js linear child-stream --pipeline docs-review --format json` for `linear-3f7dfd9d-e6dc-4e79-bd56-a2786a15c277` and capture the child manifest before implementation.
3. Harden the workflow guidance and templates to require intent checksum, protected terms, non-goals, parity matrix, safeguard split, and `Not done if` readiness review.
4. Harden the `linear create-follow-up` helper and provider-worker prompt/tests so follow-up issues carry the stronger contract plus deterministic immediate traceability.
5. Run the required validation floor, then standalone review and an explicit elegance/minimality pass before any PR/review handoff.

## Dependencies
- `AGENTS.md`
- `.agent/task/templates/prd-template.md`
- `.agent/task/templates/tech-spec-template.md`
- `.agent/task/templates/action-plan-template.md`
- `.agent/task/templates/tasks-template.md`
- `docs/micro-task-path.md`
- `orchestrator/src/cli/linearCliShell.ts`
- `orchestrator/src/cli/control/providerLinearWorkflowFacade.ts`
- `orchestrator/src/cli/providerLinearWorkerRunner.ts`
- `orchestrator/tests/LinearCliShell.test.ts`
- `orchestrator/tests/ProviderLinearWorkflowFacade.test.ts`

## Validation
- Checks / tests:
  - `MCP_RUNNER_TASK_ID=linear-3f7dfd9d-e6dc-4e79-bd56-a2786a15c277 node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear child-stream --pipeline docs-review --format json`
  - `MCP_RUNNER_TASK_ID=linear-3f7dfd9d-e6dc-4e79-bd56-a2786a15c277 node scripts/delegation-guard.mjs`
  - `MCP_RUNNER_TASK_ID=linear-3f7dfd9d-e6dc-4e79-bd56-a2786a15c277 node scripts/spec-guard.mjs --dry-run`
  - `MCP_RUNNER_TASK_ID=linear-3f7dfd9d-e6dc-4e79-bd56-a2786a15c277 npm run build`
  - `MCP_RUNNER_TASK_ID=linear-3f7dfd9d-e6dc-4e79-bd56-a2786a15c277 npm run lint`
  - `MCP_RUNNER_TASK_ID=linear-3f7dfd9d-e6dc-4e79-bd56-a2786a15c277 npm run test`
  - `MCP_RUNNER_TASK_ID=linear-3f7dfd9d-e6dc-4e79-bd56-a2786a15c277 npm run docs:check`
  - `MCP_RUNNER_TASK_ID=linear-3f7dfd9d-e6dc-4e79-bd56-a2786a15c277 npm run docs:freshness`
  - `MCP_RUNNER_TASK_ID=linear-3f7dfd9d-e6dc-4e79-bd56-a2786a15c277 node scripts/diff-budget.mjs`
  - `MCP_RUNNER_TASK_ID=linear-3f7dfd9d-e6dc-4e79-bd56-a2786a15c277 FORCE_CODEX_REVIEW=1 npm run review`
  - `MCP_RUNNER_TASK_ID=linear-3f7dfd9d-e6dc-4e79-bd56-a2786a15c277 npm run pack:smoke`
- Rollback plan:
  - revert the helper/template changes together if the new contract proves too rigid or materially breaks non-parity follow-up creation
  - keep the issue in `In Progress` and update the same workpad instead of weakening the contract silently

## Risks & Mitigations
- Risk: helper hardening becomes too heavyweight for normal follow-up creation.
  - Mitigation: keep only the drift-relevant fields required, keep the parity matrix conditional, and auto-generate traceability text.
- Risk: docs templates and helper contract diverge.
  - Mitigation: define the safeguard split in both the spec and the template text, then cover the helper sections with focused tests.
- Risk: issue-quality review language stays advisory and is ignored.
  - Mitigation: add checklist and guidance gates that make readiness failure explicit before implementation starts.

## Approvals
- Reviewer: Codex self-review plus delegated docs-review fallback completed; implementation validation complete; waiting on human PR review / merge
- Date: 2026-03-31
