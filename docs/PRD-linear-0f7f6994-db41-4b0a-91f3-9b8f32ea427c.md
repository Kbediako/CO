# PRD - CO: harden forced standalone review so boundary fallbacks do not replace review verdicts

## Summary
- Problem: forced provider-worker standalone reviews often stop at `command-intent` before a verdict; fail-closed behavior is correct, but routine manual fallback is not.
- Outcome: normal closeout diffs produce `clean-success` or `bounded-success` without allowing validation commands or hiding boundary telemetry.

## Intent Checksum
- Preserve phrases: "harden forced standalone review so boundary fallbacks do not replace review verdicts"; "manual fallback review is becoming routine instead of exceptional".
- Protected surfaces: `FORCE_CODEX_REVIEW=1`, `codex-orchestrator review`, `npm run review`, `failed-boundary`, `command-intent`, `validation-suite`, `validation-runner`, `bounded-success`, `clean-success`, `prompt_delivery=artifact-only`, `reviewer_visible_context_transport=scoped-title`, provider-worker pre-handoff review.
- Reject: validation execution, hidden telemetry, CO-102 freshness conflation, weakened guards, or waiver-only closeout.

## Parity / Alignment Matrix
- Current truth: scoped review prompt context can be artifact-only/title-only, and recent telemetry shows repeated validation-command boundaries.
- Reference truth: provider-worker handoff requires a forced review verdict before `Human Review` / `In Review`.
- Target truth: validation attempts are blocked or retried once into a verdict while preserving boundary evidence.
- Out of scope: broad outcome taxonomy redesign, CO-92/CO-94/CO-134 product changes, and repo-wide freshness cleanup.

## Goals
- Make no-validation constraints visible or enforceable for `--uncommitted`, `--base`, and `--commit`.
- Preserve strict command-intent enforcement while reducing routine manual fallback.
- Expose aggregate boundary reason counts separately from product findings.
- Add focused tests/docs for scoped transport, retry behavior, and telemetry interpretation.

## Metric
At least three scoped forced-review runs produce `clean-success` or `bounded-success` without manual fallback after validation-command attempts.
