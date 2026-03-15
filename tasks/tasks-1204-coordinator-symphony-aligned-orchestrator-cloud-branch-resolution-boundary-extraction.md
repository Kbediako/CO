# Task Checklist - 1204-coordinator-symphony-aligned-orchestrator-cloud-branch-resolution-boundary-extraction

- MCP Task ID: `1204-coordinator-symphony-aligned-orchestrator-cloud-branch-resolution-boundary-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-orchestrator-cloud-branch-resolution-boundary-extraction.md`
- TECH_SPEC: `tasks/specs/1204-coordinator-symphony-aligned-orchestrator-cloud-branch-resolution-boundary-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-cloud-branch-resolution-boundary-extraction.md`

## Docs-first

- [x] PRD drafted and aligned to the current user goal. Evidence: `docs/PRD-coordinator-symphony-aligned-orchestrator-cloud-branch-resolution-boundary-extraction.md`
- [x] TECH_SPEC drafted with bounded scope, invariants, and validation plan. Evidence: `tasks/specs/1204-coordinator-symphony-aligned-orchestrator-cloud-branch-resolution-boundary-extraction.md`
- [x] ACTION_PLAN drafted for implementation and closeout. Evidence: `docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-cloud-branch-resolution-boundary-extraction.md`
- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + .agent mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-orchestrator-cloud-branch-resolution-boundary-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-orchestrator-cloud-branch-resolution-boundary-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-cloud-branch-resolution-boundary-extraction.md`, `tasks/specs/1204-coordinator-symphony-aligned-orchestrator-cloud-branch-resolution-boundary-extraction.md`, `tasks/tasks-1204-coordinator-symphony-aligned-orchestrator-cloud-branch-resolution-boundary-extraction.md`, `.agent/task/1204-coordinator-symphony-aligned-orchestrator-cloud-branch-resolution-boundary-extraction.md`
- [x] Deliberation/findings captured for the shared cloud branch-resolution seam. Evidence: `docs/findings/1204-orchestrator-cloud-branch-resolution-boundary-extraction-deliberation.md`
- [x] `tasks/index.json` updated with the linked TECH_SPEC path. Evidence: `tasks/index.json`
- [x] `docs/docs-freshness-registry.json` updated for all new docs/task artifacts. Evidence: `docs/docs-freshness-registry.json`
- [x] `docs/TASKS.md` updated with the current snapshot and evidence. Evidence: `docs/TASKS.md`
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1204-coordinator-symphony-aligned-orchestrator-cloud-branch-resolution-boundary-extraction.md`, `docs/findings/1204-orchestrator-cloud-branch-resolution-boundary-extraction-deliberation.md`
- [x] docs-review approval or explicit override captured for registered `1204`. Evidence: `out/1204-coordinator-symphony-aligned-orchestrator-cloud-branch-resolution-boundary-extraction/manual/20260315T004111Z-docs-first/05-docs-review-override.md`

## Implementation

- [ ] One bounded helper/service owns shared cloud branch-resolution behavior. Evidence: `orchestrator/src/cli/services/`
- [ ] Cloud executor, cloud-route shell, and auto-scout evidence recorder consume the shared helper without changing branch precedence. Evidence: `orchestrator/src/cli/services/orchestratorCloudTargetExecutor.ts`, `orchestrator/src/cli/services/orchestratorCloudRouteShell.ts`, `orchestrator/src/cli/services/orchestratorAutoScoutEvidenceRecorder.ts`
- [ ] Focused regressions preserve branch precedence and adjacent caller behavior. Evidence: `orchestrator/tests/`

## Validation & Closeout

- [ ] `node scripts/delegation-guard.mjs --task 1204-coordinator-symphony-aligned-orchestrator-cloud-branch-resolution-boundary-extraction`. Evidence: `out/1204-coordinator-symphony-aligned-orchestrator-cloud-branch-resolution-boundary-extraction/manual/<timestamp>-closeout/01-delegation-guard.log`
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1204-coordinator-symphony-aligned-orchestrator-cloud-branch-resolution-boundary-extraction/manual/20260315T004111Z-docs-first/02-spec-guard.log`
- [x] `npm run docs:check`. Evidence: `out/1204-coordinator-symphony-aligned-orchestrator-cloud-branch-resolution-boundary-extraction/manual/20260315T004111Z-docs-first/03-docs-check.log`
- [x] `npm run docs:freshness`. Evidence: `out/1204-coordinator-symphony-aligned-orchestrator-cloud-branch-resolution-boundary-extraction/manual/20260315T004111Z-docs-first/04-docs-freshness.log`
