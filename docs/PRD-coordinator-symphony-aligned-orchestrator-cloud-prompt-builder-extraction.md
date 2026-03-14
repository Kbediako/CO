# PRD: Coordinator Symphony-Aligned Orchestrator Cloud Prompt Builder Extraction

## Summary

After `1201` closed the nearby `orchestrator.ts` wrapper family as a truthful no-op, the next bounded Symphony-aligned seam is the cloud prompt/domain-selection block still owned by `orchestratorCloudTargetExecutor.ts`.

## Problem

`orchestrator/src/cli/services/orchestratorCloudTargetExecutor.ts` already delegates preflight, request shaping, missing-environment failure, running-state activation, and completion through separate helpers. What remains mixed into that service is the prompt-builder concern:

- prompt-pack domain parsing
- prompt-pack candidate selection
- experience snippet shaping and truncation
- final cloud prompt assembly

Those behaviors are cohesive, already covered by dedicated tests, and distinct from the executor lifecycle. Leaving them inline keeps the cloud executor larger than necessary and makes future prompt-behavior changes harder to review.

## Goal

Extract one bounded cloud prompt builder seam so the cloud executor keeps lifecycle ownership while prompt/domain-selection behavior lives behind a narrower helper contract.

## Non-Goals

- changing cloud request retry/env parsing behavior
- changing `resolveCloudEnvironmentId(...)` precedence
- changing preflight, sibling skipping, missing-env failure, running-state, or completion logic
- broad refactors across `pipelineExperience.ts` or other experience-storage surfaces
- reopening the rejected local-wrapper family in `orchestrator.ts`

## Success Criteria

- one bounded helper/module owns cloud prompt assembly and prompt-pack domain selection
- `executeOrchestratorCloudTarget(...)` keeps executor lifecycle ownership unchanged
- focused tests preserve exact prompt content, domain-selection precedence, and snippet limits
