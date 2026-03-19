# 1169 Docs-First Summary

`1169` is registered as a truthful follow-on to `1168`. The broad execution-routing shell was already extracted in `1159`; this lane narrows to router-local policy splitting inside `routeOrchestratorExecution(...)`, with `executePipeline()` staying a thin adapter boundary.

Docs-first artifacts, task mirrors, index, and registry are synchronized for the new lane. The next implementation pass should stay within `orchestratorExecutionRouter.ts`, `orchestrator.ts`, and focused router tests.

The deterministic docs-first guard bundle is green (`spec-guard`, `docs:check`, `docs:freshness`). The initial docs-review subrun was started with the standard bounded subrun delegation override, then terminated and recorded as an explicit override after it drifted into low-signal `tasks/index.json` / checklist UI speculation instead of staying on the new `1169` docs packet.
