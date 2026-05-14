# PRD - Coordinator Symphony-Aligned Standalone Review Command-Intent Termination Boundary Provenance Classification

## Summary

`1130` made four supported standalone-review termination families first-class in telemetry and stderr. The next remaining parity gap is narrower: command-intent already has structured runtime state and typed subkinds, but the persisted `termination_boundary` contract still stays `null` for that family.

## Problem

Standalone-review already detects command-intent violations as structured runtime state:
- validation-suite launch
- validation-runner launch
- review-orchestration launch
- delegation-control activity

`run-review` already fails closed on that family, but operators still have to infer the exact command-intent boundary from the human-readable failure sentence plus summary counters because:
- `telemetry.json` still persists `termination_boundary: null` for command-intent,
- stderr does not print the stable `termination boundary: ...` line for that family,
- downstream automation cannot distinguish command-intent failures from other out-of-scope families using the same compact contract that `1130` introduced for the four supported families.

## Goals

- Extend the `termination_boundary` contract to the existing command-intent family only.
- Persist a stable machine-readable command-intent boundary record with deterministic provenance based on the current violation kind.
- Print one explicit stable terminal classification line for command-intent failures while preserving the current human-readable failure prose.
- Reuse the existing command-intent boundary state and rejection order without changing guard heuristics or thresholds.

## Non-Goals

- Extending parity to shell-probe, active-closeout/self-reference, heavy-command, timeout, stall, or startup-loop families.
- Changing any review guard thresholds, timers, or surface rules.
- Reworking review prompts or the broader wrapper architecture.
- Reopening the `1130` four-family contract beyond adding command-intent parity beside it.

## User Value

- Operators can distinguish command-intent failures from the other out-of-scope families using the same compact contract already used for the supported termination classes.
- Telemetry becomes safer to automate against because command-intent no longer requires parsing free-form prose.
- Review failure output keeps moving toward a hardened Symphony-style boundary surface where explicit runtime contracts are explicitly surfaced.

## Acceptance Criteria

- Failed `telemetry.json` writes a stable non-null `termination_boundary` record for command-intent failures.
- The record provenance is deterministic across the current command-intent subkinds.
- Terminal failure output prints one explicit stable command-intent classification/provenance line while preserving the existing human-readable failure prose.
- Supported `1130` families remain unchanged, and shell-probe / active-closeout / timeout-style families remain outside the first-class taxonomy.
- Focused runtime + wrapper regressions cover command-intent classification plus the negative out-of-scope cases.
