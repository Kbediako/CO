# TECH_SPEC - RLM Help + Cloud Fallback Stdout (0965)

## Summary
- Objective: fix `rlm --help` to be a true help path (never starts a run), and surface cloud preflight fallback reasons in `start` output so failures are actionable immediately.
- Scope: CLI wiring (`bin/codex-orchestrator.ts`), command-surface tests, doctor guidance, and support docs additions.
- Constraints: small, reviewable diff; preserve existing runtime behavior; ship via npm (dist output updated).

## Technical Requirements
- Functional requirements:
  - `codex-orchestrator rlm --help` prints `printRlmHelp()` and exits `0`.
  - `codex-orchestrator rlm "<goal>" --help` prints help and exits `0` (does not start a run; no “Task:” output).
  - `codex-orchestrator start ...` emits `manifest.summary` in stdout when present, including the cloud preflight fallback detail that is appended by the runtime.
  - `codex-orchestrator start ... --format json` includes `summary` in the JSON payload (nullable).
  - `doctor` cloud enablement guidance mentions fallback semantics and where the reason is recorded.
- Non-functional requirements:
  - Backwards-compatible CLI surface (no flag removals).
  - Non-interactive safe output formatting (single pass, no prompts).

## Implementation Notes
- `rlm --help`:
  - Add `isHelpRequest(positionals, flags)` check at the top of `handleRlm`.
  - Add a dedicated `printRlmHelp()` printer aligned with other command help printers.
  - Add/extend command-surface tests to assert the help path does not emit `Task:`.
- Cloud fallback reason in stdout:
  - Cloud preflight fallback detail is already appended to `manifest.summary` via `appendSummary(...)` in `orchestrator/src/cli/orchestrator.ts` when preflight fails.
  - Extend `emitRunOutput(...)` to include `manifest.summary` in the JSON payload and print it as a multi-line `Summary:` block in text mode when present.

## Validation Plan
- Automated:
  - `npm run test -- tests/cli-command-surface.spec.ts` (help-path regression coverage).
  - Full lane: `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `npm run docs:freshness`.
- Manual E2E:
  - `codex-orchestrator rlm --help` (global install) prints help.
  - `codex-orchestrator start diagnostics --cloud --target spec-guard` shows the cloud preflight fallback reason in stdout when `CODEX_CLOUD_ENV_ID` is unset.

