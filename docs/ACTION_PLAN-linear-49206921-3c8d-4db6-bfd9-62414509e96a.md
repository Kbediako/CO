# ACTION_PLAN - CO-230 bounded-concurrency PR snapshot hydration

## Summary
- Goal: give the parent lane a bounded implementation plan for PR snapshot hydration concurrency in `providerLinearWorkflowFacade.ts`.
- Scope: docs-first packet, parent-owned bounded scheduler implementation, facade-focused tests, docs-review, and registry/workpad/PR integration by the parent lane.
- Assumptions:
  - the workspace-local child-lane source payload is the auditable payload available to this checkout
  - the prompt-provided protected terms are authoritative
  - the smallest correct implementation changes async scheduling only, not attachment classification semantics

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `CO-230`
  - `bounded-concurrency PR snapshot hydration`
  - `providerLinearWorkflowFacade.ts`
  - `CO-220 correctness-scope changes`
  - `unbounded fanout`
  - `semantics changes`
  - `pull_request_attachments`
  - `current`
  - `historical`
  - `conflicting`
  - `unknown`
- Not done if:
  - PR snapshots still hydrate serially for multiple unique attachments
  - the implementation uses unbounded fanout
  - classification output changes for the same resolver outcomes
  - resolver failures stop mapping to `unknown`
  - the lane widens into `CO-220` correctness, merge-closeout selection, readiness gates, or attachment cleanup
- Pre-implementation issue-quality review:
  - 2026-04-20: accepted framing is bounded scheduling inside the existing issue-context PR snapshot hydration seam. Rejected framings are stale attachment disambiguation, `CO-220` PR-selection correctness, merge-closeout readiness work, GitHub API redesign, and docs-only completion.

## Milestones & Sequencing
1. Parent accepts the docs packet and adds parent-owned registry mirrors in `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
2. Parent runs docs-review before source edits.
3. Parent audits the current serial loop in `hydrateIssuePullRequestAttachments(...)` and chooses the smallest bounded scheduler shape, preferably local to `providerLinearWorkflowFacade.ts`.
4. Parent implements bounded snapshot scheduling after duplicate URL suppression and before `classifyIssuePullRequestAttachments(...)`.
5. Parent adds focused `ProviderLinearWorkflowFacade` coverage for max in-flight calls, duplicate suppression, resolver failure to `unknown`, and classification parity.
6. Parent runs scoped validation, spec-guard, implementation gate/review as appropriate, then owns Linear/workpad/PR lifecycle.

## Dependencies
- Worker prompt source anchor: `ctx:sha256:a0f6cc2354e7a629180467ab82d80cbc1ae7c8fd0cdd56b646ce2ea74e846e24#chunk:c000001`
- Workspace-local child-lane source anchor: `ctx:sha256:860a5cbc598adab7ef66949c71caa66fd1bfa1937a4abd6bf98fe3f3ebc2ecc9#chunk:c000001`
- Workspace-local source payload: `.runs/linear-49206921-3c8d-4db6-bfd9-62414509e96a-co230-docs-packet/cli/2026-04-19T21-48-39-626Z-0a8ba281/memory/source-0/source.txt`
- Origin manifest: `.runs/linear-49206921-3c8d-4db6-bfd9-62414509e96a-co230-docs-packet/cli/2026-04-19T21-48-39-626Z-0a8ba281/manifest.json`
- Parent implementation seam:
  - `orchestrator/src/cli/control/providerLinearWorkflowFacade.ts`
- Likely functions:
  - `getProviderLinearIssueContext(...)`
  - `hydrateIssuePullRequestAttachments(...)`
  - `fetchIssueContextPullRequestSnapshot(...)`
  - `classifyIssuePullRequestAttachments(...)`
- Likely parent focused tests:
  - `orchestrator/tests/ProviderLinearWorkflowFacade.test.ts`

## Validation
- Child lane only:
  - `rg -n "CO-230|bounded-concurrency PR snapshot hydration|providerLinearWorkflowFacade\\.ts|CO-220 correctness-scope changes|unbounded fanout|semantics changes|hydrateIssuePullRequestAttachments|fetchIssueContextPullRequestSnapshot|pull_request_attachments|current|historical|conflicting|unknown" docs/PRD-linear-49206921-3c8d-4db6-bfd9-62414509e96a.md docs/TECH_SPEC-linear-49206921-3c8d-4db6-bfd9-62414509e96a.md docs/ACTION_PLAN-linear-49206921-3c8d-4db6-bfd9-62414509e96a.md tasks/specs/linear-49206921-3c8d-4db6-bfd9-62414509e96a.md tasks/tasks-linear-49206921-3c8d-4db6-bfd9-62414509e96a.md .agent/task/linear-49206921-3c8d-4db6-bfd9-62414509e96a.md`
  - `perl -ne 'if (/[ \t]$/) { print "$ARGV:$.: trailing whitespace\n"; $bad=1 } END { exit($bad ? 1 : 0) }' docs/PRD-linear-49206921-3c8d-4db6-bfd9-62414509e96a.md docs/TECH_SPEC-linear-49206921-3c8d-4db6-bfd9-62414509e96a.md docs/ACTION_PLAN-linear-49206921-3c8d-4db6-bfd9-62414509e96a.md tasks/specs/linear-49206921-3c8d-4db6-bfd9-62414509e96a.md tasks/tasks-linear-49206921-3c8d-4db6-bfd9-62414509e96a.md .agent/task/linear-49206921-3c8d-4db6-bfd9-62414509e96a.md`
- Parent implementation lane:
  - focused facade tests for concurrency cap and output parity
  - parent-owned docs-review before implementation
  - parent-owned `node scripts/spec-guard.mjs --dry-run`
  - parent-selected scoped validation after source edits
  - full validation through delegation guard, spec guard, build, lint, full test suite, docs gates, stewardship, diff budget, pack smoke, standalone review, and elegance review
- Rollback plan:
  - revert to the serial hydration loop if bounded scheduling changes classification semantics, failure behavior, or call bounds

## Risks & Mitigations
- Risk: parallelization accidentally becomes unbounded on issues with many attachments.
  - Mitigation: require a local explicit cap and a max-in-flight focused regression.
- Risk: the implementation changes PR-selection correctness while touching the hydration seam.
  - Mitigation: require same resolver-output classification parity and keep `CO-220` boundaries explicit.
- Risk: one rejected resolver promise fails the whole hydration pass.
  - Mitigation: require per-candidate try/catch behavior to preserve `unknown` fallback.

## Parent-Owned Next Steps
- [x] Update `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` after accepting this child patch.
- [x] Run parent-owned docs-review before implementation.
- [x] Implement and validate the bounded scheduler in the source lane.
- [x] Complete manifest-backed standalone review and elegance review before PR handoff.
- Reconcile Linear state, workpad evidence, PR lifecycle, and merge from the authoritative parent workspace.

## Approvals
- Docs packet child lane: `.runs/linear-49206921-3c8d-4db6-bfd9-62414509e96a-co230-docs-packet/cli/2026-04-19T21-48-39-626Z-0a8ba281/manifest.json`
- Parent docs-review: `.runs/linear-49206921-3c8d-4db6-bfd9-62414509e96a-docs-review/cli/2026-04-19T22-13-11-054Z-c28faefe/manifest.json`
- Parent implementation/review: validation green through standalone review bounded success and elegance artifact `out/linear-49206921-3c8d-4db6-bfd9-62414509e96a/manual/elegance-review-20260420.md`
- PR lifecycle: pending PR creation, ready-review drain, and Linear review handoff
