# PRD - Coordinator Read-Only Observability Surface Hardening + Symphony Inclusion Plan (0998)

## Summary
- Problem Statement: 0997 delivered bounded read-only transport status access, but CO required a source-verified decision and implementation lane for compatible `openai/symphony` read-only observability patterns.
- Delivered Outcome: task 0998 implemented and validated the adopt-now compatibility subset (`/api/v1/state`, `/api/v1/<issue>`, `/api/v1/refresh` ack-only) with fail-closed deny envelopes for forbidden/unsupported actions.
- Scope Status: implementation + terminal validation complete on 2026-03-05.

## User Request Translation
- User intent: synchronize 0998 docs/task mirrors to implementation-complete status using authoritative closeout evidence.
- Required outcomes:
  - move 0998 artifacts from docs-first planning posture to implementation-complete framing,
  - record manual API simulation evidence and explicit no-mutation proof,
  - update checklist/status mirrors and task index gate metadata to the terminal implementation-gate run,
  - preserve 0996 mutating-control HOLD boundary unchanged,
  - keep checklist mirror parity between `tasks/` and `.agent/task/` copies.

## Implementation Outcome (2026-03-05)
- Authoritative implementation-gate manifest (terminal succeeded):
  - `.runs/0998-coordinator-readonly-observability-surface-hardening-and-symphony-inclusion-plan/cli/2026-03-05T03-03-28-702Z-fd352d26/manifest.json`
- Terminal closeout summary and gate evidence:
  - `out/0998-coordinator-readonly-observability-surface-hardening-and-symphony-inclusion-plan/manual/20260305T023914Z-terminal-closeout/terminal-closeout-summary.md`
  - `out/0998-coordinator-readonly-observability-surface-hardening-and-symphony-inclusion-plan/manual/20260305T023914Z-terminal-closeout/gate-results-authoritative.json`
- Manual `/api/v1` compatibility verification:
  - `out/0998-coordinator-readonly-observability-surface-hardening-and-symphony-inclusion-plan/manual/20260305T023914Z-terminal-closeout/manual-api-v1-results.json`
  - `out/0998-coordinator-readonly-observability-surface-hardening-and-symphony-inclusion-plan/manual/20260305T023914Z-terminal-closeout/manual-api-v1-results.md`
- No-mutation proof captured:
  - `state_mutation_check.pass=true` and `control_seq` remained `0 -> 0` in `manual-api-v1-results.json`.

## Scope
### In Scope
- Adopt-now implementation in 0998:
  - Symphony-compatible read-only observability projection over existing CO status surfaces.
  - deterministic fail-closed unsupported/forbidden action envelope behavior.
- Manual API simulation and no-mutation verification evidence.
- Registry + mirror synchronization (`tasks/index.json`, `docs/TASKS.md`, checklist parity).

### Out of Scope
- Mutating control promotion (`pause`, `resume`, `cancel`, `fail`, `rerun`).
- Any 0996 HOLD -> GO promotion decision.
- Importing Symphony lower-guardrail defaults that weaken CO guardrails.

## Symphony Baseline (Corrected)
- Required upstream baseline: `openai/symphony` at commit `b0e0ff0082236a73c12a48483d0c6036fdd31fe1`.
- Verification source: `out/symphony-research/20260305T020424Z-fit-gap-openai/source-verification.txt`.
- Corrected fit-gap source: `out/symphony-research/20260305T020424Z-fit-gap-openai/fit-gap-matrix-openai.md`.

## Decision Snapshot (0998)
- Adopt now in 0998 (implemented):
  - read-only Symphony-compatible observability projection over existing CO event/control surfaces,
  - deterministic read-only unsupported/forbidden action error envelopes with fail-closed behavior.
- Defer:
  - config preflight + last-known-good policy reload hardening to existing 0996 HOLD lane,
  - workspace/symlink/hook safety hardening to proposed 0999,
  - tracker-driven autonomous dispatch pilot to proposed 1000,
  - app-server dynamic-tool bridge to proposed 1001 experimental lane.
- Reject:
  - Symphony lower-guardrail defaults (`approval_policy=never` style auto-approval posture) for CO.

## Linked Findings
- Symphony assessment + adoption timing report:
  - `docs/findings/0998-openai-symphony-adoption-timing-and-slice-map.md`

## Acceptance Criteria
1. 0998 PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror are synchronized to implementation-complete state.
2. Adopt-now compatibility behaviors are evidenced by manual API simulation (`200/202/403/400/404`) with explicit deny envelopes.
3. No mutation is proven for compatibility endpoints (`control_seq` unchanged in manual results).
4. 0996 HOLD/NO-GO mutating-control boundary remains explicit and unchanged.
5. `tasks/index.json` and `docs/TASKS.md` point to terminal implementation-gate run `2026-03-05T03-03-28-702Z-fd352d26`.
6. Mirror-sync validation evidence is captured under:
   - `out/0998-coordinator-readonly-observability-surface-hardening-and-symphony-inclusion-plan/manual/20260305T032043Z-mirror-sync-post-implementation/`.
