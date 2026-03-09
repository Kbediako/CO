# 1093 Deliberation - Standalone Review Diff/Audit Surface Split

## Decision

Open the next review-reliability slice as a prompt-surface split, not another reactive drift heuristic and not a native-review rewrite yet.

## Why this seam

- `scripts/run-review.ts` still builds one mixed prompt that includes:
  - task checklist context
  - PRD summary
  - manifest evidence
  - docs/checklist/evidence verification bullets
  - bounded review execution constraints
- That means the default bounded reviewer is being asked to perform both code review and broader audit review in one pass.
- `ReviewExecutionState` already contains multiple after-the-fact guards, but the repeated drift evidence shows the upstream contract is still too broad.

## Evidence reviewed

- `scripts/run-review.ts`
- `scripts/lib/review-execution-state.ts`
- `tests/run-review.spec.ts`
- `out/1060-coordinator-symphony-aligned-standalone-review-meta-surface-expansion-guard/manual/20260308T050930Z-closeout/13-override-notes.md`
- `out/1085-coordinator-symphony-aligned-control-server-request-shell-extraction/manual/20260309T110955Z-closeout/13-override-notes.md`
- `out/1091-coordinator-symphony-aligned-control-server-ui-session-admission-helper-extraction/manual/20260309T142435Z-closeout/13-override-notes.md`
- real Symphony reference surfaces:
  - `elixir/lib/symphony_elixir/orchestrator.ex`
  - `elixir/lib/symphony_elixir_web/controllers/observability_api_controller.ex`
  - `elixir/test/symphony_elixir/orchestrator_status_test.exs`

## Read-only review conclusion

- Approved for docs-first registration.
- Recommended next bounded slice:
  - default `diff` review surface
  - explicit opt-in `audit` review surface
- Native-review rewrite is deferred unless drift persists after this prompt-contract split.
