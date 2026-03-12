# 1132 Deliberation - Standalone Review Shell-Probe Termination Boundary Provenance Classification

- Date: 2026-03-12
- Task: `1132-coordinator-symphony-aligned-standalone-review-shell-probe-termination-boundary-provenance-classification`
- Reviewer: Codex (top-level) with bounded `gpt-5.4` scout support

## Decision

- Approve the compact shell-probe parity slice as the next truthful follow-on after `1131`.

## Why this slice is next

- `1131` closed command-intent parity, so the next remaining runtime-detected boundary that still lacks first-class output parity is shell-probe.
- Shell-probe already has dedicated runtime state and already terminates review in both the poller and child-close paths, so parity does not require new heuristics or threshold work.
- This seam is smaller and more truthful than active-closeout, which is still intentionally policy-shaped as an unsupported family.

## Scope Guardrails

- In scope: shell-probe `termination_boundary` kind/provenance, stderr parity, persisted telemetry parity, and focused negative regressions for active-closeout/command-intent preservation.
- Out of scope: active-closeout/self-reference parity, heavy-command / timeout / stall / startup-loop taxonomy expansion, and any guard or prompt retuning.

## Approval Note

- Local read-only review approved. The next truthful seam is shell-probe classification parity, not broader review-surface policy work.
