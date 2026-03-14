# Next Slice Note

The next truthful Symphony-aligned lane is `1169`: orchestrator execution-routing shell extraction.

- Target seam: the remaining mode-routing and fallback shell around `routeOrchestratorExecution(...)`.
- Primary files: [orchestratorExecutionRouter.ts](/Users/kbediako/Code/CO/orchestrator/src/cli/services/orchestratorExecutionRouter.ts), [orchestrator.ts](/Users/kbediako/Code/CO/orchestrator/src/cli/orchestrator.ts), [orchestratorExecutionLifecycle.ts](/Users/kbediako/Code/CO/orchestrator/src/cli/services/orchestratorExecutionLifecycle.ts), and [OrchestratorExecutionRouter.test.ts](/Users/kbediako/Code/CO/orchestrator/tests/OrchestratorExecutionRouter.test.ts).
- Reason: after `1168`, control-plane launch is centralized, but execution dispatch still mixes runtime selection, cloud preflight, fallback recursion, and local lifecycle entry in one behavior-heavy shell.
