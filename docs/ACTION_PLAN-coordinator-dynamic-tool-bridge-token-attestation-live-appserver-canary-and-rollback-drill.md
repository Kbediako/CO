# ACTION_PLAN - Coordinator Dynamic-Tool Bridge Token Attestation + Live App-Server Canary + Rollback Drill (1013)

## Phase 1 - Docs-First Scaffold
- [x] Create PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror for task 1013.
- [x] Capture a concise deliberation/findings note for the inherited risks and prerequisites.
- [x] Keep the scaffold limited to worker-owned files only.

## Phase 2 - Prerequisite + Risk Framing
- [x] Record `1001` as the technical predecessor for dynamic-tool bridge behavior.
- [x] Record `1012` closeout handoff as the queueing prerequisite before registry sync and runtime work.
- [x] Carry forward the hidden-token-presence weakness and the custom-runs-root `P2` as explicit inherited inputs.

## Phase 3 - Runtime Contract Definition
- [x] Define the attested bridge-token verification contract and failure matrix.
- [x] Define bounded live app-server canary success/failure evidence requirements.
- [x] Define rollback-drill steps and safe-baseline acceptance criteria.
- [x] Define custom-runs-root coverage requirements for canary/control-path resolution.
- [x] Define the minimal hidden attestation object plus expected `control.json` metadata shape for bridge verification.

## Phase 4 - Registry + Review Handoff
- [x] Update `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` after `1012` closeout handoff.
- [x] Capture docs-review evidence for the registered `1013` task.
- [x] Preserve explicit notes if any shared-checkout override is needed during registration or review.

## Phase 5 - Implementation + Evidence Closeout
- [x] Capture implementation-gate closeout evidence for attested token verification, including the explicit shared-checkout review-stall override and the non-authoritative CLI fallback-flake note.
- [x] Capture live app-server canary evidence.
- [x] Capture rollback-drill evidence.
- [x] Capture required custom-runs-root compatibility evidence tied to this slice.

## Boundaries
- CO execution authority remains unchanged.
- Coordinator remains intake/control bridge only.
- No scheduler ownership transfer.
- No broad shared-registry churn outside the required `1013` task surfaces.

## Phase 4 Evidence
- Docs-review manifest: `.runs/1013-coordinator-dynamic-tool-bridge-token-attestation-live-appserver-canary-and-rollback-drill/cli/2026-03-06T00-52-08-829Z-85079438/manifest.json`
- Docs-review summary: `out/1013-coordinator-dynamic-tool-bridge-token-attestation-live-appserver-canary-and-rollback-drill/manual/20260306T011202Z-docs-review-closeout/00-summary.md`

## Phase 5 Evidence
- Appserver implementation-gate manifest: `.runs/1013-coordinator-dynamic-tool-bridge-token-attestation-live-appserver-canary-and-rollback-drill/cli/2026-03-06T02-29-57-457Z-ed341717/manifest.json`
- CLI fallback manifest (non-authoritative): `.runs/1013-coordinator-dynamic-tool-bridge-token-attestation-live-appserver-canary-and-rollback-drill/cli/2026-03-06T02-34-22-214Z-666547ac/manifest.json`
- Live canary summary: `out/1013-coordinator-dynamic-tool-bridge-token-attestation-live-appserver-canary-and-rollback-drill/manual/20260306T014527Z-live-canary/00-summary.md`
- Rollback summary: `out/1013-coordinator-dynamic-tool-bridge-token-attestation-live-appserver-canary-and-rollback-drill/manual/20260306T014527Z-rollback-drill/00-summary.md`
- Custom-runs-root nested-source canary: `out/1013-coordinator-dynamic-tool-bridge-token-attestation-live-appserver-canary-and-rollback-drill/manual/20260306T020745Z-custom-runs-root-nested-source-canary/00-summary.md`
- Control-server custom-runs-root question enqueue: `out/1013-coordinator-dynamic-tool-bridge-token-attestation-live-appserver-canary-and-rollback-drill/manual/20260306T022221Z-control-server-custom-runs-root-question-enqueue/00-summary.md`
- Closeout summary: `out/1013-coordinator-dynamic-tool-bridge-token-attestation-live-appserver-canary-and-rollback-drill/manual/20260306T024855Z-closeout/00-summary.md`
- Elegance review: `out/1013-coordinator-dynamic-tool-bridge-token-attestation-live-appserver-canary-and-rollback-drill/manual/20260306T015500Z-elegance-review/00-elegance-review.md`
