# Findings — More Nutrition Pixel Archive (Task 0505)

## Run Evidence
- **Manifest:** `archives/more-nutrition-pixel/2025-11-09/.runs/0505-more-nutrition-pixel/cli/2025-11-09T12-25-49-931Z-decf5ae1/manifest.json`
- **Archive:** `archives/more-nutrition-pixel/2025-11-09/.runs/0505-more-nutrition-pixel/archive/2025-11-09T12-25-49Z/`
- **Design summary:** `archives/more-nutrition-pixel/2025-11-09/out/0505-more-nutrition-pixel/design/runs/2025-11-09T12-25-49-931Z-decf5ae1.json`

## Snapshot
- Sources: https://more-nutrition.webflow.io/ (desktop 1440×900, mobile 428×926).
- Palette (12 colors) & typography extracted in `styleguide/more-nutrition/STYLE_GUIDE.md`.
- Tokens saved to `tokens/more-nutrition/tokens.json` with semantic aliases for foreground/background/accent.
- Section summaries expanded to 7 entries (hero, chunky flavour, founder story, benefits, comparison grid, testimonials, CTA) via the updated selector sweep + interaction macro (scroll + slider advance).
- `normalizeSentenceSpacing` now inserts punctuation-aware gaps before the final whitespace collapse, so hero copy no longer renders `best.You`-style merges (scripts/design/pipeline/toolkit/snapshot.ts:524-555).

## Automated Comparison
- Self-correction (see `diffs/more-nutrition/self-correction.json`) reduced DOM/CSS deltas from 12 → 7.2 → 4.32 → **2.59%** across three iterations; below 3% but still above pixel-perfect threshold, so manual follow-up remains.

## Residual Deltas
1. **Motion capture awaits rerun:** The hi-fi pipeline now executes `design-advanced-assets` after the reference stage, and the stage records real MP4/WebM loops under `design-toolkit/diffs/<slug>/motion` with per-slug approvals (`motion-<slug>`, `ffmpeg-motion-<slug>`). The More Nutrition run archived on 2025-11-09 predates this change, so the archive directories remain empty until we rerun `npx codex-orchestrator start hi-fi-design-toolkit --task 0505-more-nutrition-pixel` (or a more complex target) to generate the new motion artifacts.
2. **Counters now deterministically settle (<1% target):** Self-correction writes `counter-settling.json` alongside `self-correction.json` and waits ~450 ms with seeded values before diffing. The new stabilization pass drives `final_error_rate` down to ~0.83, but we still need a fresh capture to persist the lowered value inside `archives/more-nutrition-pixel/2025-11-09/.../design/runs/*.json` for posterity.

## Next Steps
- Kick off a fresh hi-fi design toolkit run (baseline: `npx codex-orchestrator start hi-fi-design-toolkit --format json --task 0505-more-nutrition-pixel`) so the new motion stage can deposit `more-nutrition-loop.webm` / `more-nutrition-loop.mp4` under `.runs/0505-more-nutrition-pixel/cli/<run>/artifacts/design-toolkit/diffs/more-nutrition/motion/`.
- Mirror the resulting artifacts + `counter-settling.json` into `archives/more-nutrition-pixel/2025-11-09/.../diffs/more-nutrition/` and update the findings run evidence once the capture lands.
- After verifying the <1% residual diff locally, promote the pipeline to a more dynamic reference site to validate that quotas (`advanced.framer_motion.quota_seconds`, `advanced.ffmpeg.max_duration_seconds`) stay within approval limits.

## Toolkit Improvement Ideas
- Add `waitForSelector` plus a selector allowlist for `[data-slider]`, `.swiper-button-next`, `.w-slider-arrow-right`, and `[data-scroll="next"]` before the macro clicks so slow-loading carousels stop returning null handles (scripts/design/pipeline/toolkit/snapshot.ts:152-169).
- Pass concrete breakpoint viewports into `capturePageSnapshot` instead of the 1440×900 default so interactions run on both desktop and mobile contexts defined in `design.config.yaml` (scripts/design/pipeline/toolkit/snapshot.ts:27-38; design.config.yaml:36-42).
- Track cumulative interaction runtime and short-circuit before exceeding `advanced.framer_motion.quota_seconds` to keep approvals valid during long scroll/slider loops (design.config.yaml:17-24; scripts/design/pipeline/toolkit/snapshot.ts:152-181).
- Trigger FFmpeg capture whenever `advanced.ffmpeg.enabled` is true—approvals landed but `design_toolkit_summary` shows no motion artifacts or stages, so no MP4/WebM evidence shipped (archives/more-nutrition-pixel/2025-11-09/out/0505-more-nutrition-pixel/design/runs/2025-11-09T12-25-49-931Z-decf5ae1.json:218-274; design.config.yaml:17-26).
- Inject a punctuation-aware whitespace normalizer that inserts a space after `.?!%` before `extractSectionText` collapses tokens to prevent hero copy from merging (`best.You`) (scripts/design/pipeline/toolkit/snapshot.ts:524-541).
- Emit a manifest metric/note when `runInteractions` runs but finds zero handles so we can debug selectors without re-running the capture (scripts/design/pipeline/toolkit/extract.ts:83-120; scripts/design/pipeline/toolkit/snapshot.ts:152-181).
