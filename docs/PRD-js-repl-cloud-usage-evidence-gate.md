# PRD - JS_REPL + Cloud Usage Evidence Gate (0990)

## Summary
- Problem Statement: CO currently has capability-level questions about when `js_repl` should be used, especially in cloud paths; recommendations were approved by the user, but with an explicit requirement to run broad dummy-repo local+cloud simulations before deciding default guidance.
- Desired Outcome: produce evidence-backed usage guidance for `js_repl` (and related advanced capability notes) from a wide local+cloud simulation matrix, then apply globally relevant docs updates in CO.

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

## Goals
- Validate `js_repl`-related capability behavior across local and cloud canary lanes in dummy repos.
- Capture deterministic evidence for runtime/cloud compatibility assertions and feature-flag propagation.
- Update global guidance surfaces in-repo (`AGENTS`, guides, README, skills) based on evidence, not assumptions.

## Non-Goals
- Large architecture refactors.
- Enabling `js_repl` as default without passing the evidence gate.

## Metrics & Guardrails
- Primary success metric: matrix pass rates at or above thresholds for required lanes with explicit artifacts and summaries.
- Guardrails:
  - `executionMode` and `runtimeMode` semantics remain orthogonal and documented.
  - Unsupported combos (notably cloud + appserver) remain fail-fast.
  - `js_repl` stays policy-deferred until matrix evidence is complete.

## Approvals
- Product: User approved recommendation set with testing-first condition on 2026-03-02.
- Engineering: Pending completion of matrix + docs updates.
- Design: N/A.
