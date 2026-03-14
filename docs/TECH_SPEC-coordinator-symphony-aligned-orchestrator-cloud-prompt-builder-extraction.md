# TECH_SPEC: Coordinator Symphony-Aligned Orchestrator Cloud Prompt Builder Extraction

## Problem Statement

The remaining prompt/domain-selection block inside `orchestratorCloudTargetExecutor.ts` is still a real behavior surface, even though the rest of the cloud executor has already been thinned into smaller helpers.

## Scope

- extract cloud prompt assembly and prompt-pack selection into one bounded helper/service
- keep the cloud executor responsible for preflight, missing-env failure, executor handoff, persistence, and run events
- preserve current prompt text and selection heuristics exactly unless tests prove an intentional change

## Out of Scope

- request env parsing and `CloudTaskExecutorInput` assembly
- cloud preflight and sibling-skip behavior
- missing-environment failure contract
- running-state activation or completion handling
- broad experience-system unification with `pipelineExperience.ts`

## Current Hypothesis

The truthful seam is the cluster currently formed by:

- `readPromptPackDomain(...)`
- `readPromptPackDomainLower(...)`
- `hasPromptPackExperiences(...)`
- `selectPromptPackForCloudPrompt(...)`
- `buildCloudExperiencePromptLines(...)`
- `buildCloudPrompt(...)`

This is a stronger next slice than another orchestrator-root reassessment because it isolates real behavior with direct focused coverage.

## Validation Plan

- `node scripts/spec-guard.mjs --dry-run`
- `npm run docs:check`
- `npm run docs:freshness`
- `npm run review` for docs-first capture
