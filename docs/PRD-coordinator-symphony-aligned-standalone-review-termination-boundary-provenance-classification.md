# PRD - Coordinator Symphony-Aligned Standalone Review Termination Boundary Provenance Classification

## Summary

`1129` made architecture-mode in-bounds reread loops terminate on the dedicated dwell boundary instead of the global wrapper timeout. The next remaining usability gap is narrower: operators still have to infer which review-runtime boundary fired from free-form failure prose plus generic telemetry counters.

## Problem

Standalone-review now has multiple explicit bounded termination classes for the review runtime:
- startup-anchor,
- meta-surface expansion,
- verdict-stability,
- relevant-reinspection dwell.

Those classes already exist as structured runtime states, but failure output and persisted telemetry still treat them mostly as free-form prose:
- terminal output prints generic telemetry counters plus a human-readable failure sentence,
- `telemetry.json` persists `status`, `error`, `output_log_path`, and `summary`, but no first-class termination-boundary classification record,
- downstream operators and future automation must parse error strings to distinguish one bounded failure class from another.

That makes the runtime less explicit than the Symphony-style capability boundary posture we are aiming for.

## Goals

- Persist a stable machine-readable termination-boundary record for the four current bounded runtime classes:
  - startup-anchor,
  - meta-surface expansion,
  - verdict-stability,
  - relevant-reinspection dwell.
- Print one explicit stable terminal classification line alongside the existing human-readable failure prose.
- Reuse the existing runtime boundary getters instead of changing heuristics or thresholds.
- Keep current error prose intact so existing operator expectations and test anchors remain stable.

## Non-Goals

- Re-tuning any review guard thresholds, timers, or surface rules.
- Extending this slice to command-intent, shell-probe, heavy-command, active-closeout-bundle reread, or generic timeout/stall/startup-loop failures.
- Replacing the wrapper with a native review controller.
- Broader prompt or architecture changes outside standalone-review telemetry/output.

## User Value

- Operators can tell immediately which bounded review contract fired without mentally decoding prose and counters.
- Telemetry becomes safer to automate against because the bounded failure class is first-class instead of string-parsed.
- Review output moves closer to a hardened Symphony-style shape where explicit boundaries have explicit surfaced classifications.

## Acceptance Criteria

- Failed `telemetry.json` writes a stable `termination_boundary` record when startup-anchor, meta-surface expansion, verdict-stability, or relevant-reinspection dwell fires.
- Terminal failure output prints one explicit stable boundary classification/provenance line for those four classes.
- Existing human-readable failure prose remains present.
- Focused runtime + wrapper regressions cover all four classes.
- `docs/standalone-review-guide.md` reflects the new telemetry/output contract.
