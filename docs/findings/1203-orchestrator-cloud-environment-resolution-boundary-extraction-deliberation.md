# 1203 Deliberation - Orchestrator Cloud Environment Resolution Boundary Extraction

## Recommendation

Proceed with a bounded shared cloud environment resolution extraction next.

## Why This Seam

- `1202` removed prompt assembly from the executor, so the remaining executor-local cloud behavior with real cross-service reuse is environment-id resolution.
- `resolveCloudEnvironmentId(...)` is already imported by the cloud route shell and auto-scout evidence recorder, which makes executor ownership misleading.
- Adjacent cloud surfaces also duplicate small `readCloudString(...)` helpers, but those should stay context only unless the implementation proves a narrower reuse boundary. The truthful seam remains the exported environment-id resolution contract.
- The contract is small enough to extract without reopening cloud request shaping, fallback policy, or completion behavior.

## Guardrails

- Preserve the current resolution precedence exactly.
- Keep prompt assembly, request numeric/default parsing, preflight target resolution, missing-env handling, and completion logic out of scope.
- Treat this as a boundary extraction, not a general cloud-helper consolidation.
