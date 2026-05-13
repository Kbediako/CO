# ACTION_PLAN - CO: Emit structured pointer-based block memory from run lifecycle seams

## Added by Bootstrap (refresh as needed)

## Summary
- Goal: land a bounded `block memory` lifecycle artifact that is pointer-based, drill-down-friendly, and discoverable from the shared run contract.
- Scope:
  - register the CO-93 docs packet, task mirrors, and workpad source
  - run audited docs-review before implementation
  - add the additive block-memory descriptor plus lifecycle emission helper
  - wire one consumer read path
  - add focused tests and run the required validation/review gates
- Assumptions:
  - the smallest truthful first slice is the orchestrator lifecycle persistence seam that already owns `run-summary.json`
  - the existing `memory.source_0` contract is the correct lower-layer precedent for a pointer-based memory descriptor

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `block memory`, pointer-based, run lifecycle seams, bounded phase granularity, drill-down pointers, additive artifact
- Not done if:
  - memory remains stored only as prose summaries
  - entries cannot drill down to source artifacts
  - no consumer reads the additive artifact
  - the lane broadens into telemetry, continuity, or worker-host parity work
- Pre-implementation issue-quality review:
  - Current repo truth is narrower than a general run-memory umbrella. `CO-91` already landed `memory.source_0`, and the remaining gap is a lifecycle-complete block index that points back to existing artifacts rather than asking consumers to reconstruct phase history ad hoc.

## Milestones & Sequencing
1. Register the `linear-a87ae732-0cf0-475e-b7af-a2dec20933e1` docs packet, task mirrors, registry entries, and workpad source; archive `docs/TASKS.md` if the new snapshot exceeds the line budget.
2. Run the audited `docs-review` child stream and fold any packet-only fixes back into the docs packet or manual fallback notes.
3. Add the additive manifest-backed block-memory descriptor and lifecycle emission helper at the run-summary persistence seam.
4. Wire one consumer read path, add focused regressions, and keep the implementation bounded to lifecycle memory rather than broader telemetry or policy work.
5. Run the required validation floor, standalone review, and explicit elegance review; refresh the workpad with the final block-memory evidence before any handoff.

## Dependencies
- `schemas/manifest.json`
- `packages/shared/manifest/types.ts`
- `orchestrator/src/cli/services/runSummaryWriter.ts`
- `orchestrator/src/cli/services/orchestratorRunLifecycleCompletion.ts`
- `orchestrator/src/cli/rlm/context.ts`
- `scripts/lib/review-prompt-context.ts`

## Validation
- Checks / tests:
  - audited `linear child-stream --pipeline docs-review`
  - focused lifecycle completion tests for block-memory emission/finalize behavior
  - focused consumer read tests
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `node scripts/diff-budget.mjs`
  - `FORCE_CODEX_REVIEW=1 npm run review`
  - `npm run pack:smoke`
- Rollback plan:
  - keep the change additive so it can be removed by deleting the new manifest descriptor/helper/consumer wiring without disturbing existing artifact truth

## Risks & Mitigations
- Block entries could drift into prose summaries instead of pointer-based retrieval anchors.
  - Mitigation: store each block as a context-object pointer with structured payload and explicit artifact selectors.
- The new layer could accidentally replace source-of-truth artifacts rather than pointing back to them.
  - Mitigation: keep traceability fields mandatory and rely on existing manifest/events/summary/log paths for drill-down.
- `docs/TASKS.md` is already at the line cap.
  - Mitigation: use the repo-supported archive fallback immediately after packet registration if needed.

## Approvals
- Reviewer: `codex-orchestrator docs-review` rerun passed `spec-guard`, `docs:check`, and `docs:freshness`, then stalled in nested forced review; manual fallback accepted
- Date: 2026-04-09
