---
id: 20260420-linear-7988e9a6-8258-4cff-b585-fadc31741ce1
title: "Merge closeout: ignore closed prior-attempt PR attachments"
relates_to: docs/PRD-linear-7988e9a6-8258-4cff-b585-fadc31741ce1.md
risk: high
owners:
  - Codex
last_review: 2026-04-20
---

# TECH_SPEC: CO-265 merge closeout closed-unmerged PR attachment disambiguation

## Scope

This spec defines the implementation contract for `CO-265`. The docs child lane owns only the docs packet and registry mirrors. The parent lane owns implementation, Linear state, workpad updates, validation, PR creation, review lifecycle, and merge.

The target code surface is `orchestrator/src/cli/control/providerMergeCloseout.ts`, especially the PR attachment selection and record/projection path used by `merge_closeout`.

## Source And Evidence

- Linear issue: `CO-265`
- Source issue: `CO-220`
- Current PR: `PR #560`
- Stale closed prior-attempt PR: `PR #516`
- Source anchor: `ctx:sha256:66e32cdd7a1c41a0c9b4a4929c72b4ad9bfddfd4107c5f4520b27cb2192a2678#chunk:c000001`
- Declared source payload: `.runs/linear-7988e9a6-8258-4cff-b585-fadc31741ce1-docs-packet-r2/cli/2026-04-19T20-14-50-934Z-8d384eca/memory/source-0/source.txt`
- Source caveat: the r2 source payload available to this lane carries run metadata plus issue id, identifier, and updated_at only. This spec preserves the same-issue CO-265 issue wording from parent evidence and current code seams in `providerMergeCloseout.ts`; no Linear mutation was performed.

## Protected Contract

The protected issue terms are:

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

## Current Code Reading

Read-only discovery found the implementation file at `orchestrator/src/cli/control/providerMergeCloseout.ts`. The code already has a `ProviderMergeCloseoutAttachedPrResolution` shape with `ignored_closed_unmerged_pr_urls`, while the merge closeout record/projection path currently emphasizes `attached_pr_urls`, `ignored_historical_pr_urls`, `conflicting_attached_pr_urls`, and `multiple_attached_prs`.

The issue diagnosis says closed-unmerged PR filtering is effective in `review_promotion` mode but not in `merge_closeout` mode. Parent implementation should verify whether the selected helper is mode-gated, whether the mode-specific candidate classification differs, and whether `ignored_closed_unmerged_pr_urls` is dropped before the merge closeout record is persisted.

## Target Selection Algorithm

For `merge_closeout`:

1. Collect attached same-repo PR candidates as the current path does today.
2. Classify candidate PR state using the same closed-unmerged definition used by `review_promotion`.
3. Exclude stale closed-unmerged retired-attempt PR attachments from the selectable current candidate set.
4. Record every excluded stale closed-unmerged URL in `ignored_closed_unmerged_pr_urls`.
5. If exactly one current candidate remains, continue with existing readiness and merge checks for that current ready PR.
6. If zero current candidates remain, fail closed with the existing no-current-PR behavior.
7. If more than one current/open candidate remains, fail closed with `multiple_attached_prs` and preserve `conflicting_attached_pr_urls`.
8. Do not ignore unknown, ambiguous, open, draft, merged-current, or failed-readiness candidates unless existing merge-closeout rules already classify them as non-current.

## Audit And Projection Contract

The parent implementation should make merge closeout evidence machine-checkable:

- Persist `ignored_closed_unmerged_pr_urls` in merge closeout audit/projection evidence.
- Keep `conflicting_attached_pr_urls` for real current ambiguity after filtering.
- Keep `reason=multiple_attached_prs` only when more than one current candidate remains after closed-unmerged filtering.
- Preserve existing evidence for selected PR URL, readiness blockers, merge state, and head-SHA checks.
- Ensure stale ignored URLs remain visible and do not require deletion from Linear attachments.

## Readiness And Safety Gates

The fix must not weaken:

- required check evaluation
- CodeRabbit/Codex review gates
- unresolved review thread checks
- mergeability checks
- draft or do-not-merge label checks
- head-SHA guards
- same-repo selection requirements

Closed-unmerged attachment filtering is a candidate disambiguation step only. It is not a readiness bypass.

## Regression Coverage Plan

Add focused coverage for:

- `merge_closeout` with current open ready `PR #560` plus stale closed-unmerged `PR #516` selects the current PR and records `ignored_closed_unmerged_pr_urls`.
- `merge_closeout` with two current/open same-repo PRs still fails with `multiple_attached_prs` and records `conflicting_attached_pr_urls`.
- `merge_closeout` with a current candidate plus normal readiness blockers still fails on the blocker.
- Existing `review_promotion` closed-unmerged filtering behavior remains unchanged.
- Unknown or ambiguous stale state is not silently ignored.

## Wrong Interpretations To Reject

- Do not delete historical attachments as the implementation strategy.
- Do not ignore multiple current/open PRs.
- Do not hide stale attachment evidence from audit output.
- Do not broaden to generic GitHub attachment cleanup or all Linear attachment lifecycle management.
- Do not weaken merge readiness checks, required checks, unresolved thread checks, or head-SHA guards.

## Non-Goals

- No automatic deletion of Linear attachments.
- No change to review promotion behavior except shared/refactored filtering if needed.
- No bypass of merge readiness, CodeRabbit/Codex review, unresolved thread, mergeability, or required-check gates.
- No broad rewrite of provider intake, PR attachment hydration, or GitHub GraphQL snapshotting.
- No changes to unrelated stale issue projection bugs.

## Not Done If

- A closed-unmerged prior-attempt PR attachment can still block merge closeout when exactly one current ready PR is attached.
- Multiple open/current PR attachments are silently ignored or auto-selected without deterministic evidence.
- The ignored stale PR URLs are not recorded in merge closeout audit/projection evidence.
- The fix requires operators to manually delete stale Linear PR attachments.
- Real conflicting current PRs, failed checks, unresolved threads, draft/do-not-merge labels, or dirty merge states can be bypassed.

## Child-Lane Validation

This child lane validates only docs and registry shape:

```bash
jq empty tasks/index.json docs/docs-freshness-registry.json
rg -n "providerMergeCloseout\\.ts|merge_closeout|review_promotion|ignored_closed_unmerged_pr_urls|conflicting_attached_pr_urls|multiple_attached_prs|stale closed-unmerged prior-attempt PR attachment|current ready PR|Linear attachments|CO-220|PR #560|PR #516|merge-closeout-closed-unmerged-pr-attachment-disambiguation|codex-orchestrator:canonical-owner-key=merge-closeout-closed-unmerged-pr-attachment-disambiguation" docs/PRD-linear-7988e9a6-8258-4cff-b585-fadc31741ce1.md docs/TECH_SPEC-linear-7988e9a6-8258-4cff-b585-fadc31741ce1.md docs/ACTION_PLAN-linear-7988e9a6-8258-4cff-b585-fadc31741ce1.md tasks/specs/linear-7988e9a6-8258-4cff-b585-fadc31741ce1.md tasks/tasks-linear-7988e9a6-8258-4cff-b585-fadc31741ce1.md .agent/task/linear-7988e9a6-8258-4cff-b585-fadc31741ce1.md docs/TASKS.md tasks/index.json
old_anchor="$(printf '%s%s' 'c128da03308c1579e05dbde0fac9611b54d4f124850dddadbf02357' 'ae9642bfe')"
old_run="$(printf '%s%s' '2026-04-19T20-01-09' '-245Z-08c9ff2e')"
old_phrase_one="$(printf '%s%s' 'read-only Linear issue' ' body')"
old_phrase_two="$(printf '%s%s' 'declared child-lane source' ' payload')"
old_phrase_three="$(printf '%s%s' 'explicit parent source' ' path')"
if rg -n "$old_anchor|$old_run|$old_phrase_one|$old_phrase_two|$old_phrase_three" docs/PRD-linear-7988e9a6-8258-4cff-b585-fadc31741ce1.md docs/TECH_SPEC-linear-7988e9a6-8258-4cff-b585-fadc31741ce1.md docs/ACTION_PLAN-linear-7988e9a6-8258-4cff-b585-fadc31741ce1.md tasks/specs/linear-7988e9a6-8258-4cff-b585-fadc31741ce1.md tasks/tasks-linear-7988e9a6-8258-4cff-b585-fadc31741ce1.md .agent/task/linear-7988e9a6-8258-4cff-b585-fadc31741ce1.md tasks/index.json docs/TASKS.md docs/docs-freshness-registry.json; then exit 1; fi
git diff --check -- docs/TASKS.md docs/docs-freshness-registry.json tasks/index.json
perl -ne 'if (/[ \t]$/) { print "$ARGV:$.: trailing whitespace\n"; $bad=1 } END { exit($bad ? 1 : 0) }' docs/PRD-linear-7988e9a6-8258-4cff-b585-fadc31741ce1.md docs/TECH_SPEC-linear-7988e9a6-8258-4cff-b585-fadc31741ce1.md docs/ACTION_PLAN-linear-7988e9a6-8258-4cff-b585-fadc31741ce1.md tasks/specs/linear-7988e9a6-8258-4cff-b585-fadc31741ce1.md tasks/tasks-linear-7988e9a6-8258-4cff-b585-fadc31741ce1.md .agent/task/linear-7988e9a6-8258-4cff-b585-fadc31741ce1.md tasks/index.json docs/TASKS.md docs/docs-freshness-registry.json
```
