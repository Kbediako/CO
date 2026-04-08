# TECH_SPEC - Coordinator Read-Only Observability Surface Hardening + Symphony Inclusion Plan

- Canonical TECH_SPEC: `tasks/specs/0998-coordinator-readonly-observability-surface-hardening-and-symphony-inclusion-plan.md`.
- Owner: Codex.
- Last Reviewed: 2026-03-05.

## Summary
- Scope: implemented 0998 adopt-now read-only observability compatibility surface plus post-implementation mirror synchronization.
- Implemented contract: `/api/v1/state`, `/api/v1/<issue>`, `/api/v1/refresh` (ack-only) with fail-closed forbidden/unsupported action envelopes.
- No-mutation guard: manual compatibility simulation confirms control state remained unchanged.
- Hard boundary: 0996 mutating control HOLD/NO-GO remains unchanged.

## Requirements
- Preserve corrected Symphony source baseline (`openai/symphony` only, verified commit).
- Enforce read-only compatibility semantics:
  - allow `/state` and `/issue` status queries,
  - allow `/refresh` acknowledgement path only,
  - reject forbidden mutating actions with deterministic `403` envelopes,
  - reject unsupported actions with deterministic `400` envelopes,
  - preserve traceability metadata on allowed and rejected requests.
- Prove no control mutation from compatibility endpoints (`control_seq` unchanged before/after manual simulation).
- Keep adopt/defer/reject matrix explicit and auditable in canonical spec.
- Keep task/docs mirrors and registry pointers aligned to terminal implementation-gate evidence.

## Acceptance
- Canonical spec records implementation-complete status for 0998 adopt-now items.
- Terminal implementation-gate evidence is authoritative:
  - `.runs/0998-coordinator-readonly-observability-surface-hardening-and-symphony-inclusion-plan/cli/2026-03-05T03-03-28-702Z-fd352d26/manifest.json`
  - `out/0998-coordinator-readonly-observability-surface-hardening-and-symphony-inclusion-plan/manual/20260305T023914Z-terminal-closeout/terminal-closeout-summary.json`
- Manual compatibility simulation evidence confirms allow/deny envelopes and no mutation:
  - `out/0998-coordinator-readonly-observability-surface-hardening-and-symphony-inclusion-plan/manual/20260305T023914Z-terminal-closeout/manual-api-v1-results.json`
  - `out/0998-coordinator-readonly-observability-surface-hardening-and-symphony-inclusion-plan/manual/20260305T023914Z-terminal-closeout/manual-api-v1-results.md`
- `tasks/index.json` and `docs/TASKS.md` point to the terminal implementation-gate run.
- Mirror-sync post-implementation docs validation/parity evidence exists under:
  - `out/0998-coordinator-readonly-observability-surface-hardening-and-symphony-inclusion-plan/manual/20260305T032043Z-mirror-sync-post-implementation/`.
- Mutating controls remain explicitly HOLD under 0996 policy and are not promoted by 0998.
