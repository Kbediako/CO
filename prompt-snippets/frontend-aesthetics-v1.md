# Frontend Aesthetics Snippet (v1)

> Use for both fresh and clone-informed design runs. Keep results distinctive, accessible, and free of AI slop. Respect `do_not_copy` markers from Hifi captures (no logos, wordmarks, proprietary shapes).

## Tone & Defaults
- Aim for confident, editorial clarity—high contrast, minimal chrome, decisive spacing.
- Accessibility first: WCAG AA contrast, keyboard-first nav, focus rings with visible offsets; always provide `prefers-reduced-motion` fallbacks.
- Legal/ethics: never lift logos/wordmarks/unique shapes; treat inspiration as aesthetic cues only.

## Axes Guidance
- **Typography** — Pair a geometric sans with a characterful display: e.g., `Soehne` / `Neue Montreal` with `Canela` or `Editorial New` for accents. Track headings tightly, keep body at 1.6–1.7 line-height. Avoid default system stacks, Roboto/Inter/Arial, and weight soup.
- **Color / Theme** — Build a mineral palette (ink, slate, bone) plus one accent. Define CSS vars up front (`--surface`, `--panel`, `--accent`, `--muted`). Avoid default purple gradients, neon rainbows, and low-contrast gray-on-gray.
- **Motion** — Purposeful, sparse motion using `200–280ms` easing (`cubic-bezier(0.18, 0.72, 0.26, 0.98)`); opacity/translate combos only. Always honor reduced-motion; avoid jittery hover spam, bouncy elastic easings, or loading shimmer walls.
- **Spatial Composition** — Use a 12-column grid with 16/24px gutters, generous outer padding, and consistent vertical rhythm (4/8/12/20/32 scale). Keep gutters and breathing room; avoid edge-to-edge cram, perfect symmetry everywhere, or misaligned cards.
- **Background & Details** — Layer subtle gradients or textured noise on a dark-to-ink canvas; use glassy panels with crisp dividers. Avoid flat white-on-purple, stock neumorphism, or oversized blurry glows. Sparingly use shape language (arcs, diagonals) to reinforce differentiation.

## AI-Slop Watchlist
- Generic hero: default purple/blue gradient, white cards, Inter 400 everywhere.
- Button clones: pill gradients with excessive drop-shadows or spinner-filled CTAs.
- Overdone motion: scale-on-hover everywhere, looping shimmer/skeleton walls, autoplay carousels.
- Asset reuse: any logo/wordmark/unique illustration from the reference—block and replace.

## Clone-Informed Guardrails
- Borrow rhythm (spacing scale), palette harmonies, and motion timing; do **not** copy logos/wordmarks/unique shapes.
- Cap style overlap at 0.10 vs. history/reference; when near threshold, introduce a new accent hue, alternate type pairing, or sharper grid to differentiate.

## Accessibility Checklist
- Maintain AA contrast for text/UI states; ensure focus outlines differ from hover.
- Provide reduced-motion fallbacks (opacity fades over transforms); respect prefers-reduced-data for heavy imagery/video.
- Ensure form controls and chart colors remain legible under colorblind-safe palettes.
