# TECH_SPEC - Review Modernization + Docs Discoverability + RLM Canary (0966)

## Summary
- Update the review wrapper (`scripts/run-review.ts`) to use `codex review` scope flags when available, persist artifacts in the active run directory, and enforce deterministic timeouts.
- Surface RLM + cloud guides from CLI help / README to reduce discovery friction for agents and downstream users.
- Add (or confirm) a fast canary test for pointer reads + `final_var` resolution.

## Design

### Review Wrapper Modernization
- Detect/enable diff scoping:
  - When the user requests scope (via wrapper flags `--uncommitted`, `--base`, `--commit`), pass those flags directly to `codex review` when supported.
  - Maintain compatibility with older Codex CLIs by falling back to prompt-only invocation if a scoped invocation fails due to unsupported flags/combination.
- Persist artifacts:
  - Always write the constructed review prompt to `<runDir>/review/prompt.txt`.
  - When `codex review` executes, tee stdout/stderr to `<runDir>/review/output.log` while still streaming to the console.
  - Prefer `CODEX_ORCHESTRATOR_RUN_DIR` when set; otherwise infer `runDir = dirname(manifestPath)`.
- Timeouts and determinism:
  - Keep a default timeout for forced non-interactive runs (`CODEX_REVIEW_TIMEOUT_SECONDS`, default `900`).
  - On timeout, send SIGTERM then SIGKILL (existing behavior) and surface an actionable message that points at the artifact log path.

### Docs Discoverability
- Add short references to:
  - `docs/guides/rlm-recursion-v2.md`
  - `docs/guides/cloud-mode-preflight.md`
  from:
  - CLI help (`bin/codex-orchestrator.ts`)
  - README “repo internals” / “downstream cheatsheet” where appropriate.

### RLM Canary
- Ensure a fast unit test covers:
  - symbolic `reads[]` pointer ingestion
  - `output_var` binding
  - `final_var` resolution to the bound output

## Compatibility Notes
- `start --format json` already emits a stable payload; review wrapper changes are internal to `npm run review` and should be additive (new artifact files only).

## Verification
- Unit tests:
  - Add/adjust tests to cover wrapper behavior (scope flags passed; artifacts written; fallback behavior when scope flags unsupported).
  - Ensure the RLM canary test runs in the default suite.
- Manual:
  - Run `npm run review` against a small local diff and confirm artifacts appear under the run directory.

