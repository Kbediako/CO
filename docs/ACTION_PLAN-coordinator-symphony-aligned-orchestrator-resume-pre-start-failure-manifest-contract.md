# ACTION_PLAN: Coordinator Symphony-Aligned Orchestrator Resume Pre-Start Failure Manifest Contract

- Date: 2026-03-14
- Owner: Codex (top-level agent)
- Task: `1166-coordinator-symphony-aligned-orchestrator-resume-pre-start-failure-manifest-contract`

## Plan

1. Add the docs-first packet for the narrow `resume()` pre-start failure contract.
2. Extend the public resume CLI test to simulate control-plane startup failure after a failed run is resumed.
3. Patch `resume()` so a pre-start failure persists a hard failed manifest state with an explicit contract marker before rethrowing.
4. Validate the focused resume regression and standard deterministic gate bundle.
