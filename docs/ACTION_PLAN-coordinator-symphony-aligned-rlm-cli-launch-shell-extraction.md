# ACTION_PLAN: Coordinator Symphony-Aligned RLM CLI Launch Shell Extraction

1. Isolate the remaining launch/start logic still owned by `handleRlm(...)`.
2. Extract that bounded shell into `orchestrator/src/cli/` while keeping binary-facing help/parse ownership local.
3. Add focused parity coverage, run the validation lane, and record the closeout evidence.
