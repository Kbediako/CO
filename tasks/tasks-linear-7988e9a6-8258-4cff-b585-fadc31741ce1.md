# Task Checklist: CO-265 merge closeout closed-unmerged PR attachment disambiguation

## Scope

- Task id: `linear-7988e9a6-8258-4cff-b585-fadc31741ce1`
- Registry id: `20260420-linear-7988e9a6-8258-4cff-b585-fadc31741ce1`
- Linear issue: `CO-265`
- Child lane: docs packet only
- Parent lane owns Linear state, workpad, implementation, validation, PR lifecycle, and merge.

## Owned Files

- `docs/PRD-linear-7988e9a6-8258-4cff-b585-fadc31741ce1.md`
- `docs/TECH_SPEC-linear-7988e9a6-8258-4cff-b585-fadc31741ce1.md`
- `docs/ACTION_PLAN-linear-7988e9a6-8258-4cff-b585-fadc31741ce1.md`
- `tasks/specs/linear-7988e9a6-8258-4cff-b585-fadc31741ce1.md`
- `tasks/tasks-linear-7988e9a6-8258-4cff-b585-fadc31741ce1.md`
- `.agent/task/linear-7988e9a6-8258-4cff-b585-fadc31741ce1.md`
- `tasks/index.json`
- `docs/TASKS.md`
- `docs/docs-freshness-registry.json`

## Protected Terms

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

## Issue-Quality Review

- [x] Issue preserves exact owner surface: `providerMergeCloseout.ts`.
- [x] Issue names the mode mismatch: `review_promotion` filters closed-unmerged stale attachments while `merge_closeout` does not.
- [x] Issue names source evidence: `CO-220`, current `PR #560`, and stale closed `PR #516`.
- [x] Issue rejects wrong implementation strategies, especially deleting Linear attachments.
- [x] Issue includes testable `Not Done If` conditions and parity requirements.

## Docs Checklist

- [x] PRD created at `docs/PRD-linear-7988e9a6-8258-4cff-b585-fadc31741ce1.md`.
- [x] TECH_SPEC created at `docs/TECH_SPEC-linear-7988e9a6-8258-4cff-b585-fadc31741ce1.md`.
- [x] ACTION_PLAN created at `docs/ACTION_PLAN-linear-7988e9a6-8258-4cff-b585-fadc31741ce1.md`.
- [x] Task spec mirror created at `tasks/specs/linear-7988e9a6-8258-4cff-b585-fadc31741ce1.md`.
- [x] Task checklist created at `tasks/tasks-linear-7988e9a6-8258-4cff-b585-fadc31741ce1.md`.
- [x] Agent task mirror created at `.agent/task/linear-7988e9a6-8258-4cff-b585-fadc31741ce1.md`.
- [x] Registry item added to `tasks/index.json`.
- [x] Snapshot entry added to `docs/TASKS.md`.
- [x] Freshness entries added to `docs/docs-freshness-registry.json`.
- [x] Scoped validation commands completed. Evidence: JSON parse, protected-term `rg`, stale-reference absence check, tracked `git diff --check`, and all-touched-file trailing-whitespace check passed on 2026-04-20.

## Parent Implementation Checklist

- [ ] Align `merge_closeout` stale closed-unmerged filtering with `review_promotion`.
- [ ] Persist `ignored_closed_unmerged_pr_urls` in merge closeout audit/projection evidence.
- [ ] Preserve `conflicting_attached_pr_urls` and `multiple_attached_prs` for real multiple current PR ambiguity.
- [ ] Add focused regression coverage for current `PR #560` plus stale closed `PR #516` shape.
- [ ] Preserve readiness blockers for failed checks, unresolved threads, draft/do-not-merge labels, dirty merge state, and head-SHA mismatch.
- [ ] Run parent-owned validation and review gates before PR handoff.

## Source Notes

- Source anchor: `ctx:sha256:66e32cdd7a1c41a0c9b4a4929c72b4ad9bfddfd4107c5f4520b27cb2192a2678#chunk:c000001`
- Declared source payload: `.runs/linear-7988e9a6-8258-4cff-b585-fadc31741ce1-docs-packet-r2/cli/2026-04-19T20-14-50-934Z-8d384eca/memory/source-0/source.txt`
- Declared manifest: `.runs/linear-7988e9a6-8258-4cff-b585-fadc31741ce1-docs-packet-r2/cli/2026-04-19T20-14-50-934Z-8d384eca/manifest.json`
- Caveat: the r2 source payload available to this lane carries run metadata plus issue id, identifier, and updated_at only. This checklist preserves the same-issue CO-265 issue wording from parent evidence and current repo seams; no Linear mutation was performed.

## Validation Commands

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
