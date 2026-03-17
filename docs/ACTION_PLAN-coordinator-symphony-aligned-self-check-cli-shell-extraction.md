# ACTION_PLAN: Coordinator Symphony-Aligned Self-Check CLI Shell Extraction

1. Isolate the remaining `self-check` output logic still owned by `handleSelfCheck(...)`.
2. Extract that bounded shell into `orchestrator/src/cli/` while keeping binary-facing parse/dispatch ownership local.
3. Add focused parity coverage, run the validation lane, and record the closeout evidence.
