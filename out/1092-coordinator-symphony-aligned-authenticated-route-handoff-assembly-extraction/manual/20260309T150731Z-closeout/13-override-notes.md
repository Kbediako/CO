# 1092 Override Notes

## docs-review override

- No separate docs-review pipeline run was launched for the `1092` docs-first registration.
- Reason: the seam was directly derived from the `1091` next-slice note, current-file inspection, and a bounded `gpt-5.4` scout; the docs-first package already passed `spec-guard`, `docs:check`, and `docs:freshness`.
- Evidence: `out/1092-coordinator-symphony-aligned-authenticated-route-handoff-assembly-extraction/manual/20260309T145637Z-docs-first/00-summary.md`, `out/1092-coordinator-symphony-aligned-authenticated-route-handoff-assembly-extraction/manual/20260309T145637Z-docs-first/04-scout-summary.md`, `out/1092-coordinator-symphony-aligned-authenticated-route-handoff-assembly-extraction/manual/20260309T145637Z-docs-first/05-docs-review-override.md`.

## diff-budget override

- `node scripts/diff-budget.mjs` required the standard stacked-branch override for this long-lived Symphony-alignment branch.
- The rerun used `DIFF_BUDGET_OVERRIDE_REASON='stacked branch continuation for 1092 symphony alignment lane'`.
- Evidence: `out/1092-coordinator-symphony-aligned-authenticated-route-handoff-assembly-extraction/manual/20260309T150731Z-closeout/08-diff-budget.log`.

## standalone review override

- `FORCE_CODEX_REVIEW=1 npm run review -- --manifest ...` launched successfully with explicit task notes and the active scout manifest.
- The wrapper first inspected the bounded files correctly, then drifted into checklist/spec synchronization, manifest-age speculation, and unrelated environment/tooling concerns instead of returning a scoped verdict on the authenticated-route handoff extraction.
- No concrete `1092`-local defect was surfaced before termination, so this remains a review-wrapper/process override rather than a passing review.
- Evidence: `out/1092-coordinator-symphony-aligned-authenticated-route-handoff-assembly-extraction/manual/20260309T150731Z-closeout/09-review.log`.
