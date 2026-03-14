# Findings - 1202 Orchestrator Cloud Prompt Builder Extraction

## Decision

Proceed with a bounded cloud prompt builder extraction next.

## Why This Seam

- `1201` closed the nearby `orchestrator.ts` wrapper family as a no-op, so the next truthful move should come from a real remaining behavior surface rather than another reassessment.
- `orchestrator/src/cli/services/orchestratorCloudTargetExecutor.ts` still owns a cohesive prompt-builder cluster: prompt-pack domain parsing, selection precedence, experience shaping, and final prompt assembly.
- Existing focused coverage already treats this as a distinct concern through `orchestrator/tests/CloudPrompt.test.ts` and the cloud executor request assertions in `orchestrator/tests/OrchestratorCloudTargetExecutor.test.ts`.
- This seam is smaller and more truthful than reopening request shaping, preflight resolution, or completion handling that were already extracted in earlier cloud-target slices.

## Out of Scope

- cloud request env/default parsing
- preflight target resolution and sibling skipping
- missing-environment failure shaping
- running-state and completion lifecycle ownership
- broad review-wrapper or docs-review guard changes in this lane

## Risk

If the lane only renames locals, the real prompt behavior remains embedded in the executor. If it widens into lifecycle or request-contract helpers, the slice stops being a bounded prompt-builder extraction.
