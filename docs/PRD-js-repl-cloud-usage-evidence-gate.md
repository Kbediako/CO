# PRD - JS_REPL + Cloud Usage Evidence Gate (0990)

## Archive Status
- Historical packet only. As of Codex CLI 0.128.0, `js_repl` has been removed, so this evidence-gate packet is not current `js_repl` usage guidance.
- Preserve this document as historical context for the prior evidence-gate decision; do not use it to justify enabling, recommending, or feature-gating `js_repl` in current CO guidance.

## CO-382 Fallback Metadata
- Large-refactor check: no large refactor is required because CO-452 removes the stale `js_repl` active posture instead of adding another compatibility layer.
- Minor-seam check: the bounded minor-seam removal is acceptable because generic cloud feature pass-through remains intact while only removed-feature guidance and canary affordances are retired.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `js_repl` active posture guidance | default-on, break-glass, and cloud feature-contract guidance for a removed feature | remove fallback | CO-452 | Codex CLI `0.128.0` removed `js_repl` | 2026-03-03 | 2026-05-01 | immediate removal | current-facing docs no longer recommend `js_repl` enable/disable or cloud feature toggles | `rg`, docs checks, focused cloud feature tests |
| scripts/js-repl-usage-matrix.mjs | active canary matrix for a removed feature | remove fallback | CO-452 | Codex CLI `0.128.0` removed `js_repl` | 2026-03-02 | 2026-05-01 | immediate removal | package script and source checkout no longer expose the `js_repl` canary as current guidance | package script audit and focused cloud feature tests |

## Summary
- Problem Statement: At the time this packet was created, CO had capability-level questions about when `js_repl` should be used, especially in cloud paths; recommendations were approved by the user, but with an explicit requirement to run broad dummy-repo local+cloud simulations before deciding default guidance.
- Desired Outcome: produce evidence-backed usage guidance for `js_repl` (and related advanced capability notes) from a wide local+cloud simulation matrix, then apply globally relevant docs updates in CO. This outcome is now historical because Codex CLI 0.128.0 removed `js_repl`.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): do not finalize `js_repl` guidance until it is tested first; run a wide array of usage-based tests in dummy repos including cloud; then apply approved recommendation updates globally.
- Success criteria / acceptance:
  - A broad dummy-repo matrix runs across local/runtime and cloud lanes with reproducible logs.
  - A clear `js_repl` recommendation is documented only after evidence review.
  - Global guidance docs are updated consistently with runtime-mode/cloud constraints and feature-gating posture.
- Constraints / non-goals:
  - Docs-first before any non-doc edits.
  - Minimal, high-leverage deltas only.
  - Preserve backward-compatible runtime behavior.

## Historical Goals
- Validate `js_repl`-related capability behavior across local and cloud canary lanes in dummy repos.
- Capture deterministic evidence for runtime/cloud compatibility assertions and feature-flag propagation.
- Update global guidance surfaces in-repo (`AGENTS`, guides, README, skills) based on evidence, not assumptions.

## Historical Non-Goals
- Large architecture refactors.
- Enabling `js_repl` as default without passing the evidence gate.

## Metrics & Historical Guardrails
- Primary success metric: matrix pass rates at or above thresholds for required lanes with explicit artifacts and summaries.
- Guardrails:
  - `executionMode` and `runtimeMode` semantics remain orthogonal and documented.
  - Unsupported combos (notably cloud + appserver) remain fail-fast.
  - Historical status: `js_repl` was policy-deferred for this packet and is now removed in Codex CLI 0.128.0.

## Historical Approvals
- Product: User approved recommendation set with testing-first condition on 2026-03-02.
- Engineering: Was pending completion of matrix + docs updates while this packet was active.
- Design: N/A.
