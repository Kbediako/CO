# ACTION_PLAN - CO STATUS: finish post-CO-97 rate-limit reset truth and Symphony-parity event/stage text

## Added by Bootstrap (refresh as needed)

## Summary
- Goal: land the smallest truthful STATUS projection/rendering patch that finishes the post-`CO-97` parity remainder for rate-limit semantics, running `STAGE`, running `EVENT`, and controls/dashboard layout.
- Scope: docs-first packet, active-state/workpad bootstrap once Linear budget resets, audited docs-review child stream, bounded projection/presenter/dashboard changes, focused tests, required validation, and review-handoff preparation.
- Assumptions:
  - current `main` already provides the authoritative combined Codex + Linear budget substrate upstream
  - the remaining lane is mostly in `selectedRunProjection.ts`, `compatibilityIssuePresenter.ts`, `controlStatusDashboard.ts`, and adjacent tests
  - the current shared Linear requests cooldown should clear around `2026-04-07T03:43:30.777Z`, after which issue/workpad mutations can proceed

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: preserve `CO STATUS`, `Rate Limits`, `STAGE`, `EVENT`, `Dashboard:`, `Status controls`, `Backoff queue`, `5-hour`, `weekly`, `requests`, `complexity`, `controlStatusDashboard.ts`, `compatibilityIssuePresenter.ts`, `selectedRunProjection.ts`, `controlRuntime.ts`, `linearBudgetState.ts`, and `linearDispatchSource.ts`.
- Not done if:
  - active started states still collapse to `running`
  - non-exhausted buckets still show `% / window`
  - exhausted buckets do not switch to `resets Xm`
  - the live surface still renders `Dashboard:` or still lumps controls into `Backoff queue`
  - generic `turn running` / `Provider worker turn is active.` text survives where richer truthful detail is available
- Pre-implementation issue-quality review:
  - the issue is narrower than a general STATUS redesign and explicitly distinct from `CO-98/99/100/81/101/17`
  - the already-correct upstream shared budget substrate is preserved as context, not re-implementation scope

## Milestones & Sequencing
1. Re-run `linear issue-context` after the shared-budget cooldown, inspect live workflow states/attachments/workpad, transition `Ready` to the team’s started state if still unblocked, and stage the single required workpad body.
2. Bootstrap the docs packet and registry mirrors, recording the current-main audit truth and the pre-implementation self-review notes.
3. Launch `linear child-stream --pipeline docs-review` for audited delegation evidence, then record the manifest or truthful fallback in the packet/workpad.
4. Implement the bounded projection-first patch:
   - preserve active Linear state in `selectedRunProjection.ts`
   - compute richer running-event truth in `compatibilityIssuePresenter.ts` (or the immediate projection seam) using existing proof/progress/polling evidence
   - update `controlStatusDashboard.ts` to format the required compact row, remove `Dashboard:`, and render a separate `Status controls` block
5. Add focused regressions, run the validation floor, perform standalone review plus elegance pass, refresh the workpad, and only then prepare PR/review handoff.

## Dependencies
- shared Linear requests bucket reset so `issue-context`, transition, and workpad mutations can succeed
- audited docs-review child stream under the workspace-scoped artifact root
- current authoritative runtime/proof/polling shapes remaining intact during the patch

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
  - `FORCE_CODEX_REVIEW=1 MCP_RUNNER_TASK_ID=linear-f71992e3-ddda-4198-b43c-97ccb36908cf npm run review -- --manifest <manifest>`
  - `npm run pack:smoke`
- Rollback plan:
  - revert the bounded projection/rendering diff in `selectedRunProjection.ts`, `compatibilityIssuePresenter.ts`, `controlStatusDashboard.ts`, and touched tests if operator output or authoritative payload agreement regresses

## Risks & Mitigations
- Risk: the cheapest patch leaves too much event inference in the renderer.
  - Mitigation: prefer an upstream running-event payload addition or message enrichment if it materially reduces `summarizeRunningEvent(...)` fallback logic.
- Risk: codex/linear budget semantics get conflated while compacting the row.
  - Mitigation: keep source composition unchanged in `controlRuntime.ts`; only change bucket formatting rules and the visible divider.
- Risk: shared Linear cooldown blocks all issue/workpad mutations longer than expected.
  - Mitigation: keep local docs/workpad artifacts current, retry after reset, and record the explicit cooldown blocker instead of faking issue/workpad state.

## Approvals
- Reviewer: pending `codex-orchestrator docs-review`
- Date: 2026-04-07
