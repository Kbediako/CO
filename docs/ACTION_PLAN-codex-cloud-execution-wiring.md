# ACTION_PLAN - Codex Cloud Execution Wiring (0957)

## Summary
- Goal: Implement real cloud execution wiring for CO while preserving existing local reliability.
- Scope: Planning, cloud execution adapters, routing integration, schema/evidence updates, and phased rollout validation.
- Assumptions: Codex Cloud access is available from the target runtime environment.

## Milestones and Sequencing
1) Docs-first foundation
- Create/refresh PRD + TECH_SPEC + ACTION_PLAN + mirrored checklists.
- Register task/spec entries and docs snapshot updates.

2) MVP cloud routing
- Add cloud execution dispatch path from orchestrator mode policy.
- Implement launch + poll terminal-state flow with retry bounds.
- Persist core cloud identifiers/status in manifests.

3) Diff/apply evidence path
- Add diff metadata capture and explicit apply support.
- Extend manifest schema and serialization for cloud evidence fields.

4) Validation and hardening
- Add/expand unit + integration tests for cloud path.
- Run full guardrail chain and capture implementation-gate evidence.

## Dependencies
- Codex Cloud CLI/API access.
- Existing CO persistence/event infrastructure.
- Guardrail and review pipelines.

## Validation
- Checks / tests:
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `node scripts/diff-budget.mjs`
  - `npm run review`
- Rollback plan:
  - Feature-guard cloud dispatch path and revert to local-only routing if regressions appear.

## Evidence
- Docs-review: `.runs/0957-codex-cloud-execution-wiring/cli/2026-02-13T09-47-41-178Z-453a5990/manifest.json`
- Implementation-gate: `.runs/0957-codex-cloud-execution-wiring/cli/2026-02-13T10-10-02-475Z-9fa15611/manifest.json`
- Cloud canary: `.runs/0957-cloud-canary-local2/cli/2026-02-13T10-47-30-259Z-6eecdc1a/manifest.json`

## Risks and Mitigations
- Risk: Cloud API behavior divergence from assumptions.
  - Mitigation: adapter layer with clear error taxonomy and integration tests.
- Risk: Manifest schema drift impacts downstream tooling.
  - Mitigation: additive nullable schema fields and compatibility tests.
- Risk: Scope creep into unrelated orchestration refactors.
  - Mitigation: strict phase boundaries and diff-budget enforcement.

## Approvals
- Reviewer:
- Date:
