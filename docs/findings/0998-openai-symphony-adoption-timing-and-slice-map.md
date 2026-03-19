# Findings - 0998 OpenAI Symphony Adoption Timing and Slice Map

- Date: 2026-03-05
- Task: `0998-coordinator-readonly-observability-surface-hardening-and-symphony-inclusion-plan`
- Scope: convert Symphony deep-research outputs into a concrete CO slice-by-slice adoption plan.

## Corrected Source Baseline
- Authoritative upstream: `openai/symphony` commit `b0e0ff0082236a73c12a48483d0c6036fdd31fe1`.
- Verification: `out/symphony-research/20260305T020424Z-fit-gap-openai/source-verification.txt`.
- Corrected fit-gap matrix: `out/symphony-research/20260305T020424Z-fit-gap-openai/fit-gap-matrix-openai.md`.

## Adopt vs Defer Map

| Symphony learning | Decision | Target slice | Why now/later |
| --- | --- | --- | --- |
| Symphony-compatible read-only observability projection | Adopt now | 0998 | Lowest-risk/high-value interop because CO already has authenticated SSE + durable events; this is additive compatibility, not authority expansion. |
| Deterministic unsupported-action fail-closed envelope | Adopt now | 0998 | Required to preserve 0997 read-only safety while adding compatibility endpoints. |
| Config preflight + last-known-good policy reload | Defer | 0996 | Directly tied to existing mutating-control HOLD lane and promotion quality gates. |
| Workspace/symlink/hook safety hardening | Defer | 0999 (proposed) | Security hardening should run as a dedicated lane before broader control-plane expansion. |
| Tracker-driven autonomous dispatch | Defer | 1000 (proposed pilot) | Highest blast radius; must remain non-authoritative and kill-switched before any expansion. |
| App-server dynamic-tool bridge | Defer | 1001 (proposed experimental lane) | High complexity and high guardrail risk; requires isolated experimental lane first. |
| Lower-guardrail Symphony defaults (`approval_policy=never` posture) | Reject | Permanent NO-GO | Conflicts with CO approval/nonce/token guardrail baseline. |

## Key Evidence Used
- Architecture extraction and reusable/incompatible primitive split:
  - `out/symphony-research/20260305T015851Z-architecture/architecture-extraction.md`
- Phased roadmap and insertion-map recommendations:
  - `out/symphony-research/20260305T015502Z-roadmap/adoption-roadmap.md`
- Risk register with phase-linked rollback triggers:
  - `out/symphony-research/20260305T015502Z-roadmap/risk-register.md`
- Corrected openai/symphony fit-gap ranking:
  - `out/symphony-research/20260305T020424Z-fit-gap-openai/fit-gap-matrix-openai.md`

## Policy Guardrail Callouts
- 0996 mutating-control HOLD/NO-GO is unchanged by 0998 planning.
- Symphony patterns are adopted as bounded primitives, not as authority or safety-model replacements.
- Any future slice that touches runtime authority must include explicit kill-switch and rollback evidence before GO.
- Windows feasibility is tracked as a deferred, low-priority roadmap consideration in `docs/findings/0998-windows-feasibility-roadmap-consideration.md`; this is non-blocking and does not alter 0998 completion status.
