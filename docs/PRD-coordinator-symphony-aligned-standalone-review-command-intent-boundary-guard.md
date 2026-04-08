# PRD - Coordinator Symphony-Aligned Standalone Review Command-Intent Boundary Guard

## Summary

After `1060`, standalone review fails closed on sustained off-task meta-surface broadening, but the live wrapper can still drift by launching bounded-policy-violating commands such as targeted tests or nested review/delegation work while remaining "active." This slice adds one bounded command-intent boundary guard so those actions are classified and stopped explicitly from the shared runtime state owner.

## Problem

- The standalone review wrapper still treats some command starts as acceptable bounded activity even when they violate the review contract.
- The final `1060` synced-tree rerun broadened into speculative meta inspection and launched its own targeted Vitest rerun instead of returning a review verdict.
- Current guards cover:
  - startup-loop hangs
  - heavy-command visibility
  - nearby-file low-signal drift
  - meta-surface expansion
- They do not yet express a first-class boundary for bounded-policy violations or explicit command-intent classes.

## Goals

- Classify live review command starts into bounded intent classes from the shared runtime state seam.
- Fail closed when bounded review launches policy-violating command intents such as targeted validation or nested review/delegation control work.
- Preserve the current Symphony-aligned structure:
  - one runtime authority (`ReviewExecutionState`)
  - thin launcher/terminator shell (`scripts/run-review.ts`)
- Keep the closeout evidence artifact-first and explicit.

## Non-Goals

- Full semantic understanding of reviewer prose or motivation.
- Converting standalone review into a supervisor, scheduler, or restart loop.
- Replacing line-parsed runtime facts with provider-native structured events.
- Broadly rewriting prompts or retrying review automatically.

## User-Facing Outcome

- In the default bounded review path, wrapper runs fail closed when review launches commands that cross the bounded review contract, even if other output still looks "active."
- Review artifacts explain whether the stop reason came from:
  - nearby-file low-signal drift
  - meta-surface expansion
  - command-intent boundary violation
