# PRD - RLM Help + Cloud Fallback Stdout (0965)

## Summary
- Problem Statement: `codex-orchestrator rlm --help` currently behaves like a real invocation (it can error for missing goal, or worse, start a run when users append `--help` after a goal). Separately, cloud preflight failures fall back to `mcp` but the reason is easy to miss because it lives in logs/manifests instead of the initial CLI output.
- Desired Outcome: make `rlm --help` always print help without starting work, and surface cloud preflight fallback reasons directly in `start` stdout (and JSON output) so agents and humans get immediate, actionable context. Add lightweight support docs that clarify the path for the three initiatives: (1) `rlm --help` UX, (2) RLM recursion v2 usage, (3) cloud preflight + fallback UX.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): keep CO agent-first and low-friction by tightening the CLI UX around RLM and cloud mode, and document the “how to use” path so agents can onboard themselves and downstream users benefit via npm shipping.
- Success criteria / acceptance:
  - `codex-orchestrator rlm --help` and `codex-orchestrator rlm "<goal>" --help` print help and exit without starting a run.
  - `codex-orchestrator start ... --cloud ...` prints a clear fallback reason when cloud preflight fails and CO falls back to `mcp`.
  - Support docs exist for all three initiatives (including RLM recursion v2 usage, even if implemented under a prior task).
  - Changes are shipped via npm (dist output updated) and validated manually.

## Goals
- Make the `rlm` command safe to explore via `--help` (no accidental runs, no “requires a goal” error for help).
- Make cloud execution fallback reasons visible immediately in `start` output.
- Provide agent-first support docs:
  - RLM recursion v2 usage patterns (pointer-first + `output_var` / `final_var`).
  - Cloud preflight + fallback behavior and how to configure it.

## Non-Goals
- Redesigning the entire CLI argument parser or switching to a new CLI framework.
- Changing cloud execution semantics (we keep current “preflight then fallback to mcp” behavior).
- Adding new cloud environment provisioning automation in this task.

## Stakeholders
- Downstream npm users running `codex-orchestrator` as their primary wrapper.
- CO maintainers and reviewers validating behavior via CI + manifests.
- Agents (Codex) using CO as a self-bootstrapping execution harness.

## Support Docs (Deliverables)
- RLM recursion v2 usage guide: `docs/guides/rlm-recursion-v2.md` (initiative 2).
- Cloud mode preflight + fallback guide: `docs/guides/cloud-mode-preflight.md` (initiative 3).

