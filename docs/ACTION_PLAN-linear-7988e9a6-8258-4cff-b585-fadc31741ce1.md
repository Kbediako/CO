# ACTION_PLAN: CO-265 merge closeout closed-unmerged PR attachment disambiguation

## Goal

Prepare and hand off a docs-first `CO-265` packet so the parent lane can implement a narrow `merge_closeout` fix in `providerMergeCloseout.ts`: ignore stale closed-unmerged prior-attempt PR attachments only when exactly one current ready PR remains, record `ignored_closed_unmerged_pr_urls`, and preserve all normal merge-readiness gates.

## Constraints

- This child lane edits only docs and registry mirror files in the declared scope.
- Do not edit implementation or tests from this lane.
- Do not call Linear mutation helpers.
- Do not run full repo validation suites.
- Do not require deleting Linear attachments.
- Do not weaken readiness checks, required checks, unresolved thread checks, mergeability checks, or head-SHA guards.

## Source Evidence

- Linear issue: `CO-265`
- Source issue: `CO-220`
- Current ready PR: `PR #560`
- Stale closed prior-attempt PR: `PR #516`
- Source anchor: `ctx:sha256:66e32cdd7a1c41a0c9b4a4929c72b4ad9bfddfd4107c5f4520b27cb2192a2678#chunk:c000001`
- Declared source payload: `.runs/linear-7988e9a6-8258-4cff-b585-fadc31741ce1-docs-packet-r2/cli/2026-04-19T20-14-50-934Z-8d384eca/memory/source-0/source.txt`
- Declared manifest: `.runs/linear-7988e9a6-8258-4cff-b585-fadc31741ce1-docs-packet-r2/cli/2026-04-19T20-14-50-934Z-8d384eca/manifest.json`
- Source caveat: the r2 source payload available to this lane carries run metadata plus issue id, identifier, and updated_at only. This action plan preserves the same-issue CO-265 issue wording from parent evidence and current repo seams; no Linear mutation was performed.

## Plan

1. Create the PRD, TECH_SPEC, ACTION_PLAN, task spec mirror, task checklist, and agent task mirror for `linear-7988e9a6-8258-4cff-b585-fadc31741ce1`.
2. Register the packet in `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
3. Preserve the protected issue wording:
   - `providerMergeCloseout.ts`
   - `merge_closeout`
   - `review_promotion`
   - `ignored_closed_unmerged_pr_urls`
   - `conflicting_attached_pr_urls`
   - `multiple_attached_prs`
   - stale closed-unmerged prior-attempt PR attachment
   - current ready PR
   - Linear attachments
   - `CO-220`
   - `PR #560`
   - `PR #516`
   - `merge-closeout-closed-unmerged-pr-attachment-disambiguation`
   - `codex-orchestrator:canonical-owner-key=merge-closeout-closed-unmerged-pr-attachment-disambiguation`
4. Record issue-quality review, wrong interpretations, non-goals, `Not Done If`, and current/reference/target parity matrix.
5. Run only scoped docs/JSON validation and leave the patch in the child lane workspace for parent export.

## Parent Implementation Plan

1. Inspect `orchestrator/src/cli/control/providerMergeCloseout.ts` for the difference between `review_promotion` and `merge_closeout` candidate classification.
2. Reuse or refactor the closed-unmerged filtering helper so `merge_closeout` ignores stale closed-unmerged retired-attempt PR attachments.
3. Add `ignored_closed_unmerged_pr_urls` to merge closeout audit/projection evidence if it is currently dropped.
4. Preserve `conflicting_attached_pr_urls` and `multiple_attached_prs` for real multiple-current-PR ambiguity.
5. Add focused regression coverage for the `CO-220` shape and for failure cases with multiple current PRs and normal readiness blockers.
6. Run parent-owned focused and full validation gates before PR handoff.

## Exit Criteria For This Child Lane

- Docs-first packet files exist in the declared scope.
- Registry mirrors are updated in the declared scope.
- Protected terms are present across the packet.
- JSON registries parse.
- `git diff --check` passes for the touched docs and registry files.
- No implementation or test files are edited.
- No commit is created.
