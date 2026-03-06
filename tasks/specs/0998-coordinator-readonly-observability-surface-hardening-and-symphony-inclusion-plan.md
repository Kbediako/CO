---
id: 20260305-0998-coordinator-readonly-observability-surface-hardening-and-symphony-inclusion-plan
title: Coordinator Read-Only Observability Surface Hardening + Symphony Inclusion Plan
relates_to: docs/PRD-coordinator-readonly-observability-surface-hardening-and-symphony-inclusion-plan.md
risk: high
owners:
  - Codex
last_review: 2026-03-05
---

## Summary
- Objective: implement the 0998 adopt-now Symphony-compatible read-only observability slice and close out mirrors with authoritative terminal evidence.
- Scope: implemented `/api/v1` read-only compatibility projection (`/state`, `/issue`, `/refresh` ack-only) plus fail-closed unsupported/forbidden action envelopes, then synchronized docs/task mirrors.
- Status: implementation complete and terminally validated on 2026-03-05.

## Pre-Implementation Review Note
- Decision: approved for docs-first planning execution.
- Reasoning: user requested immediate next-slice momentum plus explicit Symphony inclusion timing with corrected-source verification.

## Post-Implementation Review Note
- Decision: approved as implementation-complete for 0998 adopt-now items.
- Reasoning: terminal implementation-gate run succeeded and manual `/api/v1` simulation verifies read-only compatibility behavior with no control-state mutation.

## Scope Boundaries
### In Scope
- Implement and validate Symphony-compatible read-only observability projection over existing CO control state surfaces.
- Implement and validate deterministic fail-closed unsupported/forbidden action envelopes for compatibility endpoints.
- Preserve traceability metadata on allowed and denied compatibility requests.
- Synchronize 0998 PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror to implementation-complete posture.
- Update `tasks/index.json` and `docs/TASKS.md` to terminal implementation-gate evidence.

### Out of Scope
- Runtime mutating-control promotion (`pause`, `resume`, `cancel`, `fail`, `rerun`).
- Any 0996 HOLD -> GO promotion decision.
- Importing Symphony lower-guardrail defaults that reduce CO guardrails.

## Symphony Research Evidence (Mandatory Sources)
1. `out/symphony-research/20260305T015851Z-architecture/architecture-extraction.md`
2. `out/symphony-research/20260305T015502Z-roadmap/adoption-roadmap.md`
3. `out/symphony-research/20260305T015502Z-roadmap/risk-register.md`
4. `out/symphony-research/20260305T020424Z-fit-gap-openai/fit-gap-matrix-openai.md`
5. `out/symphony-research/20260305T020424Z-fit-gap-openai/source-verification.txt`

## Corrected Baseline Contract
- Upstream reference is restricted to `openai/symphony` at commit `b0e0ff0082236a73c12a48483d0c6036fdd31fe1`.
- Prior mistaken baseline (`knutkirkhorn/symphony`) is non-authoritative and excluded from 0998 decisions.
- Source of truth: `out/symphony-research/20260305T020424Z-fit-gap-openai/source-verification.txt`.

## Symphony Inclusion Decision Matrix (Canonical)

| Item | Decision | Target Slice | GO Criteria | NO-GO Criteria | Evidence |
| --- | --- | --- | --- | --- | --- |
| Symphony-compatible read-only observability projection (`/state`, `/issue`, `/refresh` style compatibility over existing CO surfaces) | Adopt now (implemented) | 0998 | (1) `status_only` inbound contract stays read-only; (2) compatibility routes cannot invoke `pause/resume/cancel/fail/rerun`; (3) existing CO auth/session checks stay mandatory; (4) deny-path tests + docs evidence captured. | Any compatibility route can execute mutating action, bypass auth, or hide traceability metadata. | `.../fit-gap-matrix-openai.md` (observability row), `.../architecture-extraction.md` (sections 5.2/5.3), `.../adoption-roadmap.md` (A1), `.../risk-register.md` (R1). |
| Read-only unsupported-action envelope (explicit structured errors for unknown/forbidden action/tool requests) | Adopt now (implemented) | 0998 | Unsupported/malformed requests fail closed with deterministic, auditable error payloads; no implicit action remapping. | Unknown or malformed action reaches execution path, or is silently remapped. | `.../adoption-roadmap.md` (B2), `.../risk-register.md` (R5), `.../fit-gap-matrix-openai.md` (tooling/compatibility observations). |
| Config preflight + last-known-good reload semantics for transport policy | Defer | 0996 (existing HOLD lane) | Invalid config cannot widen capability; errors are explicit; last-known-good retention is tested; HOLD posture is preserved on config failure. | Invalid config silently enables broader transport actions or suppresses HOLD enforcement. | `.../adoption-roadmap.md` (A2), `.../risk-register.md` (R2), `tasks/specs/0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness.md`. |
| Workspace/symlink/hook safety hardening | Defer | 0999 (proposed) | Path-under-root and symlink-escape checks fail closed; hook timeout behavior is bounded and observable. | Any workspace escape or unbounded hook stall exists. | `.../architecture-extraction.md` (sections 2.1/2.4), `.../adoption-roadmap.md` (B1), `.../risk-register.md` (R3/R4). |
| Tracker-driven autonomous dispatch adapter | Defer | 1000 (proposed pilot) | Pilot remains non-authoritative; CO authority invariants hold; kill-switch and rollback drill pass. | Dispatch loop mutates control state outside approved boundaries or lacks safe rollback. | `.../fit-gap-matrix-openai.md` (tracker-driven dispatch row), `.../adoption-roadmap.md` (C1), `.../risk-register.md` (R6/R7). |
| App-server dynamic-tool bridge | Defer | 1001 (proposed experimental lane) | Experimental isolation, explicit security review, bounded blast radius, and reversible kill-switch are in place before promotion. | Dynamic-tool path bypasses CO approval/guardrails or creates opaque authority expansion. | `.../fit-gap-matrix-openai.md` (app-server dynamic tools row), `.../architecture-extraction.md` (sections 4.4/4.5). |
| Symphony lower-guardrail defaults (for example `approval_policy=never`-style auto-approval posture) | Reject | Permanent NO-GO in CO baseline | N/A (policy rejection). | Any attempt to replace CO delegate-mode nonce/token guardrails with lower-guardrail defaults. | `.../fit-gap-matrix-openai.md` (safety baseline row), `.../architecture-extraction.md` (incompatible list), `tasks/specs/0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness.md`. |

## 0998 Implementation Outcomes (Adopt-Now Items)
- Manual `/api/v1` simulation overall pass: true (`manual-api-v1-results.json`).
- Compatibility read-only behaviors validated:
  - GET `/api/v1/state`: `200` (pass)
  - GET `/api/v1/task-0940`: `200` (pass)
  - GET `/api/v1/task-missing`: `404` (pass)
  - POST `/api/v1/refresh` ack-only: `202` (pass)
  - POST `/api/v1/refresh` forbidden mutating action (`pause`): `403` (pass)
  - POST `/api/v1/refresh` unsupported action (`custom-action`): `400` (pass)
- No mutation proof: `state_mutation_check.pass=true` and `control_seq` remained `0 -> 0`.
- Terminal implementation-gate run succeeded:
  - Run id: `2026-03-05T03-03-28-702Z-fd352d26`
  - Manifest: `.runs/0998-coordinator-readonly-observability-surface-hardening-and-symphony-inclusion-plan/cli/2026-03-05T03-03-28-702Z-fd352d26/manifest.json`

## 0996 HOLD Boundary (Explicit Carry-Forward)
- 0998 does not promote mutating controls.
- 0996 remains the only lane for mutating control promotion readiness decisions.
- Until explicit HOLD -> GO approval evidence exists in 0996, mutating controls remain HOLD/NO-GO.

## Deferred Windows Roadmap Pointer
- Windows feasibility findings are recorded in `docs/findings/0998-windows-feasibility-roadmap-consideration.md`.
- Scope posture: deferred and low-priority (`0999/1002/1003` follow-up only), non-blocking for completed 0998 status.
- Guardrail posture: no change to 0996 HOLD boundaries or current authority model.

## Findings Link
- `docs/findings/0998-openai-symphony-adoption-timing-and-slice-map.md`

## Acceptance
- PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror are synchronized to implementation-complete state.
- Canonical decision matrix remains explicit for adopt/defer/reject with GO/NO-GO criteria and target slices.
- Corrected baseline proof (`openai/symphony` commit verification) remains embedded.
- Manual API simulation evidence confirms read-only compatibility behavior and deny envelopes, with no control mutation.
- Registry mirrors are updated to terminal implementation-gate pointers: `tasks/index.json` and `docs/TASKS.md`.
- Validation evidence captured under:
  - terminal closeout: `out/0998-coordinator-readonly-observability-surface-hardening-and-symphony-inclusion-plan/manual/20260305T023914Z-terminal-closeout/`
  - mirror sync post-implementation: `out/0998-coordinator-readonly-observability-surface-hardening-and-symphony-inclusion-plan/manual/20260305T032043Z-mirror-sync-post-implementation/`

## Validation Plan (Mirror-Sync Stream)
- `npm run docs:check`
- `npm run docs:freshness`
- `diff -u tasks/tasks-0998-coordinator-readonly-observability-surface-hardening-and-symphony-inclusion-plan.md .agent/task/0998-coordinator-readonly-observability-surface-hardening-and-symphony-inclusion-plan.md`

## Validation Evidence (Implementation + Mirror Sync, 2026-03-05)
- Historical docs-first lane (planning baseline):
  - `.runs/0998-coordinator-readonly-observability-surface-hardening-and-symphony-inclusion-plan/cli/2026-03-05T02-12-26-527Z-37b88d62/manifest.json`
  - `out/0998-coordinator-readonly-observability-surface-hardening-and-symphony-inclusion-plan/manual/20260305T020937Z-docs-first-and-symphony-plan/`
- Terminal implementation closeout (authoritative):
  - `.runs/0998-coordinator-readonly-observability-surface-hardening-and-symphony-inclusion-plan/cli/2026-03-05T03-03-28-702Z-fd352d26/manifest.json`
  - `out/0998-coordinator-readonly-observability-surface-hardening-and-symphony-inclusion-plan/manual/20260305T023914Z-terminal-closeout/terminal-closeout-summary.md`
  - `out/0998-coordinator-readonly-observability-surface-hardening-and-symphony-inclusion-plan/manual/20260305T023914Z-terminal-closeout/manual-api-v1-results.json`
  - `out/0998-coordinator-readonly-observability-surface-hardening-and-symphony-inclusion-plan/manual/20260305T023914Z-terminal-closeout/gate-results-authoritative.json`
- Mirror-sync post-implementation lane:
  - `out/0998-coordinator-readonly-observability-surface-hardening-and-symphony-inclusion-plan/manual/20260305T032043Z-mirror-sync-post-implementation/00-evidence-note.md`
  - `out/0998-coordinator-readonly-observability-surface-hardening-and-symphony-inclusion-plan/manual/20260305T032043Z-mirror-sync-post-implementation/01-docs-check.log`
  - `out/0998-coordinator-readonly-observability-surface-hardening-and-symphony-inclusion-plan/manual/20260305T032043Z-mirror-sync-post-implementation/02-docs-freshness.log`
  - `out/0998-coordinator-readonly-observability-surface-hardening-and-symphony-inclusion-plan/manual/20260305T032043Z-mirror-sync-post-implementation/03-mirror-parity.log`

## Status Update (2026-03-05)
- 0998 adopt-now implementation items are complete and terminally validated.
- Compatibility `/api/v1` simulation confirms read-only behavior with explicit deny envelopes for forbidden/unsupported actions.
- No control mutation occurred during compatibility-endpoint simulation (`control_seq` unchanged).
- `tasks/index.json` and `docs/TASKS.md` are synchronized to the terminal implementation-gate run.
- 0996 mutating-control HOLD/NO-GO remains unchanged.

## Approvals
- Reviewer: Codex.
- Date: 2026-03-05.
