# TECH_SPEC - Cloud + RLM Adoption Reliability + Fallback Contract Hardening (0974)

- Objective: improve cloud/RLM adoption reliability with approved additive hardening across doctor diagnostics, low-friction MCP enablement, execution resilience, and CI contracts.
- Scope: first-class doctor cloud preflight path, cloud/RLM adoption hints, low-friction `mcp enable`, configurable cloud status retry knobs, and canary fallback assertions.
- Canonical TECH_SPEC: `tasks/specs/0974-cloud-adoption-preflight-reliability.md`.

## Requirements
- Add `doctor` cloud preflight visibility for immediate readiness checks.
- Add `doctor --usage` adoption hints for underused cloud/RLM paths.
- Add `mcp enable` for safe enablement of disabled MCP servers with redacted display output.
- Add bounded env knobs for cloud status retry behavior.
- Validate both cloud execution and fallback contracts in canary CI.

## Validation
- `npm run test -- orchestrator/tests/Doctor.test.ts orchestrator/tests/DoctorUsage.test.ts orchestrator/tests/McpEnable.test.ts orchestrator/tests/CodexCloudTaskExecutor.test.ts orchestrator/tests/CloudModeAdapters.test.ts tests/cli-command-surface.spec.ts`
- `npm run docs:check`
- `npm run lint`
- `npm run build`

## Approvals
- User approved direction on 2026-02-18.
