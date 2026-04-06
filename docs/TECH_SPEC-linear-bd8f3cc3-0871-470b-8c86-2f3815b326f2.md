---
id: 20260406-linear-bd8f3cc3-0871-470b-8c86-2f3815b326f2
title: CO STATUS: make live attach scrolling work without accumulated full-frame history
relates_to: docs/PRD-linear-bd8f3cc3-0871-470b-8c86-2f3815b326f2.md
risk: high
owners:
  - Codex
last_review: 2026-04-06
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-bd8f3cc3-0871-470b-8c86-2f3815b326f2.md`
- PRD: `docs/PRD-linear-bd8f3cc3-0871-470b-8c86-2f3815b326f2.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-bd8f3cc3-0871-470b-8c86-2f3815b326f2.md`
- Task checklist: `tasks/tasks-linear-bd8f3cc3-0871-470b-8c86-2f3815b326f2.md`

## Summary
- Objective: keep `co-status attach` live and scrollable while eliminating accumulated full-frame primary-scrollback history and fixing the bounded readability/truth defects called out on the same live surface.
- Scope:
  - docs-first registration for `CO-97`
  - attach live primary redraw semantics in `controlStatusDashboard.ts`
  - bounded countdown, rate-limit, retry, and event readability fixes
  - presenter/read-model freshness only if still reproduced during validation
  - focused regressions plus real-device screenshot proof
- Constraints: preserve attach as read-only, preserve launch-mode alternate-screen semantics, and avoid widening back into the full `CO-83` telemetry lane without new evidence.

## Issue-Shaping Contract
- Preserve: live scrollable `CO STATUS`, no accumulated duplicate full-frame history, `co-status attach`, `primary scrollback`, `alternate screen`, and the exact file/test surfaces named in the issue.
- Reject:
  - alternate-screen fallback as the solution
  - framing this as only the old `CO-67` bug
  - docs-only closeout without renderer behavior changes
  - telemetry-lane widening without proof the remaining defect escaped the attach/view seam
- Explicit non-goals: no `/ui` redesign, no pause-first fallback, no broad styling churn.

## Design
1. Keep launched live mode on alternate screen and attached live mode on primary scrollback.
2. Replace attach-mode full-frame primary rewrites with a pinned live-region rewrite that rewinds and clears only the live block when both the previous and next frame fit the viewport, otherwise falling back to a fresh `ANSI_CLEAR_HOME` rewrite.
3. Measure pinned attach rows by terminal display-cell width instead of UTF-16 length so wide glyphs, emoji, flags, and keycaps do not corrupt the rewind math.
4. Reuse dashboard-local higher-order duration formatting for `Next refresh`, runtime/age, retry countdowns, and reset windows.
5. Tighten only presentation for Codex / Linear rate-limit output and running/retry summaries unless validation proves a separate presenter/read-model truth defect still survives.
6. Capture device-local screenshot proof directly in Linear, visually inspect it, cross-check authoritative root-host payload values, and clean up temporary proof surfaces.

## Validation
- docs-review child stream: `/Users/kbediako/Code/CO/.runs/linear-bd8f3cc3-0871-470b-8c86-2f3815b326f2-co-97-docs-review/cli/2026-04-06T09-58-42-515Z-642faafe/manifest.json`
- focused dashboard tests for pinned redraw semantics, viewport fallbacks, and wide-glyph rewind math
- full repo validation floor after implementation
- manifest-backed standalone review attempt plus explicit elegance/minimality pass before handoff

## Approvals
- Reviewer: docs-review child stream clean
- Date: 2026-04-06
