# ACTION_PLAN: Coordinator Symphony-Aligned Orchestrator Cloud Prompt Builder Extraction

## Objective

Move the cloud prompt/domain-selection behavior out of `orchestratorCloudTargetExecutor.ts` without widening back into request or lifecycle ownership.

## Steps

1. Register the bounded prompt-builder seam docs-first and capture the local review rationale.
2. Extract the prompt/domain-selection helpers into one adjacent helper/service while preserving prompt output.
3. Tighten focused cloud prompt and cloud executor regressions around prompt selection and request prompt content.
4. Run the lane validations, record elegance/override notes, and sync checklist mirrors.
