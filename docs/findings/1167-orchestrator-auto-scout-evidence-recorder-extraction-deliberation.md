# 1167 Deliberation Findings

- Date: 2026-03-14
- Task: `1167-coordinator-symphony-aligned-orchestrator-auto-scout-evidence-recorder-extraction`

## Decision

Proceed with a narrow extraction of the class-local `runAutoScout(...)` cluster into one adjacent helper/service.

## Why This Slice

- After `1165`, there is no truthful shared public lifecycle helper left to extract.
- After `1166`, the remaining meaningful orchestrator seam is not another public-entry fix; it is the embedded auto-scout recorder utility.
- `runAutoScout(...)` is cohesive, class-state-free, and already bounded by an existing router contract.
- Existing integration coverage in `orchestrator/tests/OrchestratorCloudAutoScout.test.ts` makes this seam verifiable without speculative scope expansion.
- The most truthful extracted name is `recordOrchestratorAutoScoutEvidence`, because this seam records and shapes evidence rather than owning the broader “scout” stage decision.

## Guardrails

- Do not move routing or manifest ownership into the extracted helper.
- Do not change the `auto-scout.json` artifact format.
- Keep the helper focused on env merge, timeout handling, evidence write, and normalized outcome shaping.
