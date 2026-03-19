# ACTION_PLAN: Coordinator Symphony-Aligned RLM CLI Completion and State Reporting Shell Extraction

1. Isolate the exact post-start completion/state-reporting logic still owned by `handleRlm(...)`.
2. Extract that bounded shell into `orchestrator/src/cli/` while keeping binary-facing help/parse/doctor-tip ownership local.
3. Add focused parity coverage, run the validation lane, and record the closeout evidence.
