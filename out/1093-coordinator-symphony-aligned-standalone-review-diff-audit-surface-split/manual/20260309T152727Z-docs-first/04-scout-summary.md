# 1093 Scout Summary

- The strongest remaining reliability defect is prompt-surface conflation in `scripts/run-review.ts`, not missing drift heuristics.
- The default review prompt still mixes:
  - diff-local code review
  - task checklist context
  - PRD summary
  - manifest evidence
  - docs/checklist/evidence verification bullets
- `ReviewExecutionState` now has multiple fail-closed guards, but they only stop drift after the reviewer has already widened into non-diff surfaces.
- Recent closeouts (`1060`, `1085`, `1091`) all show the same pattern: the wrapper reaches the bounded diff, then broadens into audit/history/checklist surfaces without surfacing a concrete diff-local defect.
- Recommended next slice:
  - make `diff` the default review surface
  - add an explicit opt-in `audit` surface
  - keep any larger native-review rewrite deferred unless drift persists after that contract split
