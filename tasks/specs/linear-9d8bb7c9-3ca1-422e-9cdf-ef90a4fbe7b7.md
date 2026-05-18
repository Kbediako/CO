---
id: 20260423-linear-9d8bb7c9-3ca1-422e-9cdf-ef90a4fbe7b7
title: "CO-331 queue cap and follow-up admission truth"
status: done
relates_to: docs/PRD-linear-9d8bb7c9-3ca1-422e-9cdf-ef90a4fbe7b7.md
risk: high
owners:
  - Codex
last_review: 2026-05-18
review_notes:
  - 2026-05-18: CO-522 spec lifecycle audit found the linked task checklist has zero unchecked items (9 checked), so this spec is terminal and eligible for implementation-docs archive. Evidence: `out/linear-b642e879-ba50-45ef-b0d9-b059afa9e932-recovery/spec-preexpiry-local-classification.json`.
---

# Task Spec: CO-331 queue cap and follow-up admission truth

## User Intent

Restore one truthful queue contract across `Backlog`, `Ready`, `provider-intake-state.json`, `co-status`, `max_allowed`, active issue identifiers, resumable claims, and follow-up issue admission.

## Target Contract

- Helper-created follow-up issues that are explicitly placed in `Backlog` stay non-admitted until a real queue policy promotes them.
- Resumable claims and queued retry claims occupy provider admission capacity.
- `provider-intake-state.json` and `co-status` expose the same active issue identifiers used by admission.
- Queue-cap or promotion drift is visible through concrete hold/block evidence.

## Current / Reference / Target Parity Matrix

| Surface | Current Drift | Authoritative Reference | Target State |
| --- | --- | --- | --- |
| `Backlog` / `Ready` follow-up issue admission | Helper-created follow-ups can appear in `Ready` immediately after being explicitly created or reset to `Backlog`. | Linear state remains authoritative for user-visible queue position, but helper follow-up descriptions define the traceability packet required before leaving `Backlog`. | Follow-ups with pending traceability packets stay in `Backlog` with hold evidence until deliberate sequencing or packet completion allows promotion to `Ready`. |
| `provider-intake-state.json` | Active claim projection can miss resumable claims or queued retry claims and therefore understate admission pressure. | Persisted provider claims plus discovered run identities are the canonical admission inputs for `max_allowed`. | Resumable claims and queued retry claims consume admission capacity, keyed by claim/run occupancy identity, and active issue identifiers reflect that pressure. |
| `co-status` | Operator status can show active issue identifiers above `max_allowed` while intake and Linear disagree about what is active. | `co-status` should render the same active issue identifiers derived from provider intake/admission truth. | `co-status`, `provider-intake-state.json`, and live Linear state agree on which issues are active, held in `Backlog`, or blocked by queue capacity. |

## Protected Terms

- `Backlog`
- `Ready`
- `provider-intake-state.json`
- `co-status`
- `max_allowed`
- active issue identifiers
- resumable claims
- follow-up issue admission

## Wrong Interpretations To Reject

- Do not treat this as only `CO-317`.
- Do not explain it away with `CO-329` or `CO-330` runtime/provider failures.
- Do not excuse over-cap retry work because it is not technically `running`.
- Do not solve queue truth through manual moves or host restarts.

## Implementation Checklist

- [x] Add traceability-pending follow-up detection to backlog promotion.
- [x] Hold matching follow-up issues in `Backlog` with operator-visible evidence.
- [x] Count resumable claims against direct admission capacity.
- [x] Count queued retry claims against direct admission capacity.
- [x] Align provider intake active summary projection with queued retry occupancy.
- [x] Add focused regressions for autopilot, admission, and summary projection.
- [x] Run required validation and review gates before handoff.

## Review Notes

- 2026-04-23: Issue-quality review approved this scope as covering the full CO-331 request, including `Backlog` follow-up admission, retry/resumable occupancy, provider intake state, `co-status`, and `max_allowed` alignment.
- 2026-04-23: Before implementation, the parent worker completed a standalone task/spec review against the Linear issue intent and approved the docs packet as sufficient for implementation.
- 2026-04-23: Manifest-backed standalone review completed with `status: succeeded` and `review_outcome: clean-success`; post-review elegance/minimality pass found no avoidable abstraction or unrelated branch scope.

## Not Done If

- Freshly created backlog follow-ups can still become `Ready` / active without deliberate sequencing.
- Active provider claims can still exceed `max_allowed` during resumable/retry rehydration.
- `co-status`, `provider-intake-state.json`, and live Linear issue state can still disagree about which issues are truly active.
