# 1206 Deliberation - Orchestrator Cloud Interactive Env Default Fallback Contract

## Recommendation

Proceed with a narrow executor-local fix.

## Why This Seam

- The failing guard run produced a concrete, reproducible assertion in `OrchestratorCloudTargetExecutor.test.ts`.
- The regression is confined to one local request-shaping cluster: interactive env fallback inside `orchestratorCloudTargetExecutor.ts`.
- The fix is small and independent from the broader `1205` reassessment outcome.
- Normalizing blank strings to defaults matches the existing behavior expected by the test and by adjacent cloud request contracts.

## Guardrails

- Touch only the interactive env fallback path and its focused tests.
- Preserve explicit nonblank override precedence.
- Do not reopen branch/environment-id resolution or broader cloud request-contract extraction.
