# ACTION_PLAN - CO STATUS: finish post-CO-103 Symphony parity for Agents, live runtime ticking, and EVENT truth

## Added by Bootstrap (refresh as needed)

## Summary
- Goal: land the smallest truthful STATUS patch that closes the three remaining `CO-107` gaps against the Symphony handling model.
- Scope: docs-first packet, audited docs-review child stream, bounded read-model/runtime/dashboard changes, focused regressions, required validation, review/elegance gates, and real-device screenshot proof embedded in the Linear workpad.
- Assumptions:
  - current `main` already contains the `CO-103` rate-limit/event/stage improvements that this lane builds on
  - the remaining implementation is concentrated in `controlStatusDashboard.ts`, `compatibilityIssuePresenter.ts`, `controlRuntime.ts`, `operatorDashboardPresenter.ts`, and `observabilityReadModel.ts`
  - the current live issue/workpad state is already normalized to `In Progress` with one persistent workpad comment

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: preserve `CO STATUS`, `Agents`, `Runtime`, `AGE / TURN`, `EVENT`, `running/max_allowed`, `current_running/current_tracked`, `controlStatusDashboard.ts`, `compatibilityIssuePresenter.ts`, `controlRuntime.ts`, `status_dashboard.ex`, `dashboard_live.ex`, `presenter.ex`, `orchestrator.ex`, and `max_concurrent_agents`.
- Not done if:
  - the denominator is still tracked issue count
  - visible runtime/age/event recency still freeze on cached frames
  - generic event filler still wins over authoritative message/progress text
  - the closeout lacks real screenshot proof embedded directly in Linear
- Pre-implementation issue-quality review:
  - the issue is narrower than a general STATUS refresh and should not reopen adjacent rate-limit/token/dashboard work
  - the cleanest denominator source is the existing live provider concurrency contract, not a new constant

## Milestones & Sequencing
1. Draft and register the full docs packet for `linear-0001b15c-e8cc-4ce9-ad45-c898e326420e`, including task mirrors and freshness registry updates.
2. Launch `linear child-stream --pipeline docs-review` for audited delegation evidence; if it fails only on an unrelated repo baseline, record truthful fallback evidence rather than blocking the lane.
3. Implement the bounded STATUS changes:
   - surface `max_allowed` from the live concurrency contract into the dataset
   - switch the header `Agents` line to `running/max_allowed`
   - add a live wall-clock anchor for cached-frame runtime/age/recency rendering
   - tighten upstream `display_event` authorship so message/progress data wins over generic fallback
4. Add focused regression coverage for denominator mapping, live ticking behavior, and message-first event semantics.
5. Run the validation floor, standalone review, and elegance pass; refresh the workpad with findings, proof, and final handoff status before any review transition.

## Dependencies
- audited child-stream execution under the workspace-scoped `.runs/linear-0001b15c-e8cc-4ce9-ad45-c898e326420e*/` artifact root
- current provider feature-toggle/concurrency contract remaining readable from the control runtime
- current Symphony reference files in `/Users/kbediako/Code/symphony`

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
  - `FORCE_CODEX_REVIEW=1 npm run review -- --manifest <manifest>`
  - `npm run pack:smoke`
- Rollout verification:
  - prove `Agents` matches `running/max_allowed`
  - prove cached-frame runtime/age/recency text advances over wall-clock time
  - prove message/progress text wins over generic fallback to `EVENT`
  - embed real-device screenshots directly in the Linear workpad

## Risks & Mitigations
- Risk: the denominator is sourced from a config snapshot that can drift from the live admission contract.
  - Mitigation: source it from the same runtime/config seam already used by provider admission logic.
- Risk: a cached-frame ticking fix still freezes because it reuses the first snapshot `referenceTime`.
  - Mitigation: carry a snapshot wall-clock anchor and re-derive live reference time on every redraw.
- Risk: dashboard fallback logic still outranks upstream text after the presenter change.
  - Mitigation: make `display_event` authoritative and keep fallback strictly secondary.

## Approvals
- Reviewer: `codex-orchestrator docs-review` child stream rerun passed `spec-guard` and `docs:check`, then failed only on repo-wide `docs:freshness` baseline; manual fallback accepted
- Date: 2026-04-08
