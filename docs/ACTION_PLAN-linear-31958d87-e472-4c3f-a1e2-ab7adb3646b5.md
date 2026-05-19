# ACTION_PLAN - CO-538 verify create-follow-up labels with live post-mutation reads

## Summary
- Goal: make `codex-orchestrator linear create-follow-up` prove terminal live labels after create or canonical owner reuse before reporting clean success.
- Scope: docs packet, implementation guidance, live post-create/post-reuse verification, bounded `addedLabelIds` repair, fail-closed label evidence, and terminal live-label output.
- Assumptions:
  - CO-482 source-derived label assignment remains the baseline contract.
  - The parent implementation can use an existing live issue read path equivalent to `live linear issue-context`.
  - This child lane performs no implementation, Linear/GitHub, PR, or lifecycle work.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: `codex-orchestrator linear create-follow-up`, `CO-482`, `CO-537`, `labels: []`, `labelIds`, `addedLabelIds`, `live linear issue-context`, `post-create live verification`, `canonical owner reuse`, `source-derived labels`, `fail closed`.
- Not done if:
  - mutation-return labels, cached labels, provider projection, workpad text, or stale issue-context output can authorize clean success.
  - live target labels can remain `labels: []` or miss expected source-derived labels after clean success.
  - bounded repair does not perform a final live reread.
  - persistent missing labels lack issue id or identifier plus expected, observed, and missing labels.
  - JSON or human terminal output omits terminal live labels.
  - implementation changes label taxonomy, CO-400 projection semantics, provider admission, queue prioritization, or unrelated lifecycle surfaces.
- Pre-implementation issue-quality review: docs child lane confirms the request is a narrow live-verification follow-up to CO-482 and CO-537 context, not a label taxonomy/projection/provider-admission task.
- Fallback / refactor decision: this task removes the stale/cached/mutation-return label authority fallback. A larger refactor is not required because live Linear remains the single terminal label authority.
- Durable retention evidence: no retained fallback. The durable contract is live post-mutation label verification.
- Large-refactor check: defer broader helper refactors unless parent implementation finds live verification cannot be added inside the existing `create-follow-up` facade without splitting authority.

## Milestones & Sequencing
1. Docs-first packet and registry mirrors.
   - Create PRD, TECH_SPEC, ACTION_PLAN, task checklist, `.agent/task` mirror, `tasks/index.json` entry, `docs/TASKS.md` snapshot, and docs freshness registry rows.
2. Parent implementation planning.
   - Inspect CO-482 label resolution and mutation paths.
   - Identify or add a live target issue read path equivalent to `live linear issue-context`.
3. Live verification implementation.
   - After create, read live follow-up labels and compare expected source-derived labels by id.
   - After canonical owner reuse, read live follow-up labels and compare expected source-derived labels by id.
   - For missing labels, perform one bounded `addedLabelIds` repair and live reread.
   - Fail closed on persistent missing labels with issue id or identifier, expected labels, observed labels, and missing labels.
4. Output and tests.
   - Expose terminal live labels in JSON and human terminal output.
   - Add focused tests for create success with live missing labels, post-create/post-reuse reads, propagation delay, reuse repair, persistent missing labels, and operator output.
5. Parent validation and review.
   - Run focused tests first, then parent-required validation/review gates before PR lifecycle handoff.

## Dependencies
- Existing `create-follow-up` facade and CLI shell.
- CO-482 source-derived label assignment contract.
- Live Linear issue read support equivalent to `live linear issue-context`.
- Parent-owned Linear/GitHub/workpad/PR lifecycle.

## Validation
- Checks / tests:
  - Child lane: JSON parse checks, target file presence checks, and `git diff --check`.
  - Parent lane: focused `ProviderLinearWorkflowFacade` tests and CLI output tests for the new live-verification contract.
  - Parent lane: spec guard, build, lint, tests, docs checks, review, and elegance pass as required by the provider-worker workflow.
- Rollback plan:
  - If live verification cannot be completed inside the existing helper scope, stop and relaunch with widened ownership rather than accepting mutation-return labels as authority.

## Risks & Mitigations
- Risk: propagation delay after create makes live labels briefly absent.
  - Mitigation: bounded repair and final live reread; fail closed with explicit evidence if labels remain absent.
- Risk: implementation accidentally broadens into CO-400 projection or label taxonomy work.
  - Mitigation: keep live target issue labels as the only terminal authority and reject projection/taxonomy changes.
- Risk: output reports requested labels instead of terminal live labels.
  - Mitigation: require JSON/human terminal output tests that distinguish expected, observed, missing, and terminal live labels.

## Approvals
- Reviewer: provider-worker parent lane.
- Date: 2026-05-14.
