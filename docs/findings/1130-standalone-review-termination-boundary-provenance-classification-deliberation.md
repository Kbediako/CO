# Findings - 1130 Standalone Review Termination Boundary Provenance Classification

## Decision

Open a bounded output-contract slice that makes the current standalone-review termination classes first-class in telemetry and stderr without changing any runtime guard heuristics.

## Why now

- `1129` already solved the live architecture in-bounds timeout path.
- The next truthful gap is output shape, not another termination heuristic.
- Operators still infer the fired boundary class from free-form error text and generic telemetry counters.

## Recommended seam

- `scripts/lib/review-execution-state.ts`
  - add a compact persisted termination-boundary record for the four in-scope classes
- `scripts/run-review.ts`
  - pass the existing rejection order through unchanged
  - print one stable boundary-class line alongside current failure output
- `tests/review-execution-state.spec.ts`
  - payload/unit coverage for the new persisted record
- `tests/run-review.spec.ts`
  - wrapper coverage for terminal output + telemetry on the four classes

## Rejected alternatives

- Replacing the wrapper with a native review controller.
  - Rejected because the current gap is contract surfacing, not controller ownership.
- Broad parity for command-intent, shell-probe, heavy-command, active-closeout-bundle, and generic timeout failures.
  - Rejected because `1129` only tees up the four current termination classes.
- Rewriting current failure prose.
  - Rejected because existing tests and operator expectations already anchor on those strings.
