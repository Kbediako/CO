# ACTION_PLAN: Coordinator Symphony-Aligned Setup CLI Wrapper Extraction

1. Isolate the remaining `setup` wrapper logic still owned by `handleSetup(...)`.
2. Extract that bounded shell into `orchestrator/src/cli/` while keeping binary-facing parse/dispatch ownership local.
3. Add focused parity coverage, run the validation lane, and record the closeout evidence.
