# 1131 Deliberation - Standalone Review Command-Intent Termination Boundary Provenance Classification

- Date: 2026-03-12
- Task: `1131-coordinator-symphony-aligned-standalone-review-command-intent-termination-boundary-provenance-classification`
- Reviewer: Codex (top-level) with bounded `gpt-5.4` scout support

## Decision

- Approve the compact command-intent parity slice as the next truthful follow-on after `1130`.

## Why this slice is next

- `1130` intentionally stopped at the four currently supported first-class termination families.
- Command-intent already has structured runtime state and typed subkinds, so it is the smallest remaining parity gap in the `termination_boundary` contract.
- Extending that one family does not require new heuristics, threshold changes, or prompt redesign.

## Scope Guardrails

- In scope: command-intent `termination_boundary` kind/provenance, stderr parity, persisted telemetry parity, and focused negative regressions for out-of-scope families.
- Out of scope: shell-probe parity, active-closeout/self-reference parity, heavy-command / timeout / stall / startup-loop taxonomy expansion, and any guard or prompt retuning.

## Approval Note

- Local read-only review approved. The next truthful seam is command-intent classification parity, not broader failure-taxonomy work.
