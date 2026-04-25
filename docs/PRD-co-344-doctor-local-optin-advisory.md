# PRD - CO-344 Doctor Local Opt-In Advisory

## Summary
After CO-341 merged, a focused validator found that `codex-orchestrator doctor` can warn about an unverified `[codex_orchestrator] local_model_opt_in = "gpt-5.5"` marker while still returning overall `codex_defaults.status = ok` when portable `gpt-5.4` model defaults are active.

## User Request Translation
- Raise and validate Linear issues for observed model-posture problems.
- Keep `gpt-5.5` posture evidence-gated rather than silently treating stale local markers as clean.
- Land the smallest doctor/reporting fix and finish the Linear closeout loop.

## Goals
- Make an unverified local model opt-in marker force overall doctor defaults status to `advisory`.
- Add focused coverage for portable `gpt-5.4` defaults plus stale local `gpt-5.5` marker.
- Preserve the CO-341 posture split: packaged defaults stay portable, local `gpt-5.5` remains marker-backed and access-verified.

## Non-Goals
- No change to generated defaults.
- No change to model access probing semantics.
- No broader doctor redesign.

## Validation
- `npm run test:core -- orchestrator/tests/Doctor.test.ts`
- `git diff --check`
- docs/registry checks required for the docs-first packet.
