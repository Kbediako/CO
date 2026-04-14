# ACTION_PLAN - CO: harden forced standalone review so boundary fallbacks do not replace review verdicts

## Summary
- Goal: forced provider-worker standalone review produces bounded verdicts even when validation-command attempts occur.
- Scope: review launch visibility, command-intent retry, telemetry/workpad interpretation, tests, and docs.
- Assumption: command-intent detection is correct; the bug is verdict replacement by routine fallback.

## Readiness Gate
- Protected terms: `FORCE_CODEX_REVIEW=1`, `codex-orchestrator review`, `npm run review`, `failed-boundary`, `command-intent`, `validation-suite`, `validation-runner`, `bounded-success`, `clean-success`, `prompt_delivery=artifact-only`, `reviewer_visible_context_transport=scoped-title`.
- Not done if: manual fallback remains routine, docs-only changes land, boundaries are hidden, or validation commands are permitted.
- Approved after issue-context inspection, workpad bootstrap, required parallelization decision, and bounded surface scan.

## Sequence
1. Complete docs packet, registry links, workpad refresh, and docs-review evidence.
2. Implement scoped launch guidance, command-intent retry, and telemetry reason-count surfacing.
3. Add focused regressions plus repro review evidence for `--uncommitted`, `--base`, and `--commit`.
4. Run full validation, forced standalone review, elegance pass, `pack:smoke`, PR handoff, and `pr ready-review`.

## Risks
- Retry could hide a real boundary failure; mitigation: one stricter retry only, repeated attempts remain `failed-boundary`.
- Scoped title guidance could become brittle; mitigation: keep it compact and test exact transport behavior.

## Approvals
- Reviewer: codex-orchestrator docs-review (succeeded)
- Date: 2026-04-14
