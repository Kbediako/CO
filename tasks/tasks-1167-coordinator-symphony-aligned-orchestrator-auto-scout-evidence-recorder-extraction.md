# Task 1167 — Coordinator Symphony-Aligned Orchestrator Auto-Scout Evidence Recorder Extraction

- MCP Task ID: `1167-coordinator-symphony-aligned-orchestrator-auto-scout-evidence-recorder-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-orchestrator-auto-scout-evidence-recorder-extraction.md`
- TECH_SPEC: `tasks/specs/1167-coordinator-symphony-aligned-orchestrator-auto-scout-evidence-recorder-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-auto-scout-evidence-recorder-extraction.md`

> This lane follows the completed `1166` resume contract fix. The next truthful move is the class-local auto-scout recorder extraction, not another public lifecycle helper.

## Checklist

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + .agent mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-orchestrator-auto-scout-evidence-recorder-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-orchestrator-auto-scout-evidence-recorder-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-auto-scout-evidence-recorder-extraction.md`, `tasks/specs/1167-coordinator-symphony-aligned-orchestrator-auto-scout-evidence-recorder-extraction.md`, `tasks/tasks-1167-coordinator-symphony-aligned-orchestrator-auto-scout-evidence-recorder-extraction.md`, `.agent/task/1167-coordinator-symphony-aligned-orchestrator-auto-scout-evidence-recorder-extraction.md`
- [x] Deliberation/findings captured for the auto-scout recorder seam. Evidence: `docs/findings/1167-orchestrator-auto-scout-evidence-recorder-extraction-deliberation.md`

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1167-coordinator-symphony-aligned-orchestrator-auto-scout-evidence-recorder-extraction.md`, `docs/findings/1167-orchestrator-auto-scout-evidence-recorder-extraction-deliberation.md`
- [x] docs-review approval or explicit override captured for registered `1167`. Evidence: `.runs/1167-coordinator-symphony-aligned-orchestrator-auto-scout-evidence-recorder-extraction/cli/2026-03-13T23-24-43-044Z-a3ce1809/manifest.json`, `out/1167-coordinator-symphony-aligned-orchestrator-auto-scout-evidence-recorder-extraction/manual/20260313T233817Z-closeout/13-override-notes.md`

## Implementation

- [x] `runAutoScout(...)` extraction lands in one adjacent helper/service. Evidence: `orchestrator/src/cli/services/orchestratorAutoScoutEvidenceRecorder.ts`, `orchestrator/src/cli/orchestrator.ts`
- [x] The extracted seam owns merged env resolution, timeout handling, evidence write, and normalized outcomes only. Evidence: `orchestrator/src/cli/services/orchestratorAutoScoutEvidenceRecorder.ts`, `out/1167-coordinator-symphony-aligned-orchestrator-auto-scout-evidence-recorder-extraction/manual/20260313T233817Z-closeout/12-elegance-review.md`
- [x] Focused helper coverage proves `recorded`, `timeout`, and `error`. Evidence: `orchestrator/tests/OrchestratorAutoScoutEvidenceRecorder.test.ts`, `out/1167-coordinator-symphony-aligned-orchestrator-auto-scout-evidence-recorder-extraction/manual/20260313T233817Z-closeout/05b-targeted-tests.log`
- [x] Existing orchestration integration still proves `auto-scout.json` recording on the cloud/non-trivial path. Evidence: `orchestrator/tests/OrchestratorCloudAutoScout.test.ts`, `out/1167-coordinator-symphony-aligned-orchestrator-auto-scout-evidence-recorder-extraction/manual/20260313T233817Z-closeout/05b-targeted-tests.log`

## Validation + Closeout

- [x] `node scripts/delegation-guard.mjs` Evidence: `out/1167-coordinator-symphony-aligned-orchestrator-auto-scout-evidence-recorder-extraction/manual/20260313T233817Z-closeout/01-delegation-guard.log`
- [x] `node scripts/spec-guard.mjs --dry-run` Evidence: `out/1167-coordinator-symphony-aligned-orchestrator-auto-scout-evidence-recorder-extraction/manual/20260313T233817Z-closeout/02-spec-guard.log`
- [x] `npm run build` Evidence: `out/1167-coordinator-symphony-aligned-orchestrator-auto-scout-evidence-recorder-extraction/manual/20260313T233817Z-closeout/03-build.log`
- [x] `npm run lint` Evidence: `out/1167-coordinator-symphony-aligned-orchestrator-auto-scout-evidence-recorder-extraction/manual/20260313T233817Z-closeout/04-lint.log`
- [x] `npm run test` Evidence: `out/1167-coordinator-symphony-aligned-orchestrator-auto-scout-evidence-recorder-extraction/manual/20260313T233817Z-closeout/05-test.log`, `out/1167-coordinator-symphony-aligned-orchestrator-auto-scout-evidence-recorder-extraction/manual/20260313T233817Z-closeout/05b-targeted-tests.log`, `out/1167-coordinator-symphony-aligned-orchestrator-auto-scout-evidence-recorder-extraction/manual/20260313T233817Z-closeout/05c-docs-hygiene-targeted.log`
- [x] `npm run docs:check` Evidence: `out/1167-coordinator-symphony-aligned-orchestrator-auto-scout-evidence-recorder-extraction/manual/20260313T233817Z-closeout/06-docs-check.log`
- [x] `npm run docs:freshness` Evidence: `out/1167-coordinator-symphony-aligned-orchestrator-auto-scout-evidence-recorder-extraction/manual/20260313T233817Z-closeout/07-docs-freshness.log`
- [x] `node scripts/diff-budget.mjs` Evidence: `out/1167-coordinator-symphony-aligned-orchestrator-auto-scout-evidence-recorder-extraction/manual/20260313T233817Z-closeout/08-diff-budget.log`
- [x] `npm run review` Evidence: `out/1167-coordinator-symphony-aligned-orchestrator-auto-scout-evidence-recorder-extraction/manual/20260313T233817Z-closeout/09-review.log`, `out/1167-coordinator-symphony-aligned-orchestrator-auto-scout-evidence-recorder-extraction/manual/20260313T233817Z-closeout/13-override-notes.md`
- [x] `npm run pack:smoke` Evidence: `out/1167-coordinator-symphony-aligned-orchestrator-auto-scout-evidence-recorder-extraction/manual/20260313T233817Z-closeout/10-pack-smoke.log`
