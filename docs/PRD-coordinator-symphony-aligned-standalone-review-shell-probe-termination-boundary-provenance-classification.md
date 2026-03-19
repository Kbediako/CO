# PRD - Coordinator Symphony-Aligned Standalone Review Shell-Probe Termination Boundary Provenance Classification

## Summary

`1131` closed the command-intent parity gap in the standalone-review `termination_boundary` contract. The next remaining parity gap is narrower and already backed by runtime state: repeated shell-probe activity already hard-stops review, but it still does not emit a first-class `termination_boundary` record or stable classification line.

## Problem

Standalone-review already tracks dedicated shell-probe runtime state:
- repeated shell-probe attempts,
- bounded reason text,
- captured sample text,
- a dedicated hard-stop path in both the poller loop and natural child-close handling.

Operators still have to infer shell-probe failures from free-form prose because:
- `telemetry.json` still persists `termination_boundary: null` for shell-probe failures,
- stderr does not print the stable `termination boundary: ...` line for that family,
- downstream automation cannot consume shell-probe as the same compact contract now used for the supported `1130` families plus command-intent.

## Goals

- Extend the first-class `termination_boundary` contract to the existing shell-probe family only.
- Persist a stable machine-readable shell-probe boundary record with compact provenance.
- Print one explicit stable terminal classification line for shell-probe failures while preserving the current human-readable failure prose.
- Reuse the existing shell-probe runtime state and current rejection order without changing thresholds or guard behavior.

## Non-Goals

- Extending parity to active-closeout/self-reference, heavy-command, timeout, stall, or startup-loop families.
- Changing shell-probe thresholds, timers, or prompt rules.
- Reworking broader review-surface policy or replacing the wrapper with a native review path.
- Reopening command-intent, startup-anchor, meta-surface-expansion, verdict-stability, or relevant-reinspection-dwell behavior beyond parity preservation.

## User Value

- Operators can distinguish shell-probe failures from other out-of-scope families using the same compact contract already used elsewhere in standalone review.
- Telemetry becomes safer to automate against because shell-probe no longer requires parsing free-form prose.
- Review failure output keeps converging toward a hardened Symphony-style runtime contract surface where already-detected boundary families are surfaced explicitly and consistently.

## Acceptance Criteria

- Failed `telemetry.json` writes a stable non-null `termination_boundary` record for shell-probe failures.
- The record provenance is deterministic for the existing shell-probe family and preserves current redaction behavior.
- Terminal failure output prints one explicit stable shell-probe classification/provenance line while preserving the existing human-readable failure prose.
- Command-intent plus the supported `1130` families remain unchanged, and active-closeout / heavy-command / timeout-style families remain outside the first-class taxonomy.
- Focused runtime + wrapper regressions cover shell-probe classification plus the negative out-of-scope cases.
