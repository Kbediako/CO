# ACTION PLAN: Coordinator Symphony-Aligned Orchestrator Execution-Routing Policy Splitting

1. Register `1169` docs-first and sync task mirrors/index/registry.
2. Split `routeOrchestratorExecution(...)` into router-local policy helpers without changing public behavior.
3. Add or extend focused router tests for:
   - runtime-selection failure short-circuit
   - cloud preflight hard-fail when fallback is disabled
   - cloud preflight fallback recursion preserving adjusted runtime mode and env overrides
   - local-route behavior unchanged under `mcp`
4. Run the required validation bundle and close the lane with explicit override notes if review/docs-review drift recurs.
