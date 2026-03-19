# Findings - 1016 Live Linear Ingress And Telegram Delta Deliberation

## Decision
- Proceed with a bounded ingress-and-delta slice that builds directly on `1015` rather than widening control semantics or inventing a separate live-status formatter.

## Why This Slice Now
- `1015` established the shared selected-run projection boundary.
- The remaining product gap is event flow: live advisory ingress and proactive Telegram oversight.
- The user approved the new slice, future slices, and full control over Linear/Telegram setup.

## Accepted Direction
- Add a fail-closed Linear webhook route outside `/api/v1`.
- Persist accepted advisory delivery state in a run-local sidecar with replay protection.
- Feed accepted advisory state through the same selected-run projection used by state/issue/UI/Telegram.
- Add bounded Telegram push notifications driven by projection deltas and/or the existing run event stream.

## Rejected Alternatives
- Making Linear authoritative or mutation-capable:
  - rejected because it violates the coordinator boundaries and the user's stated end goal.
- Adding a second Telegram formatter or router first:
  - rejected because it would reintroduce the projection drift `1015` just removed.
- Treating Symphony as implementation source-of-truth:
  - rejected because the real `openai/symphony` repo is useful only as a partial reference: it provides a Linear skill/client/shared projection model, but it is poll-based, has no Telegram surface, and carries a looser unattended-orchestration posture than CO should adopt.

## Risks To Watch
- Signature verification using the wrong request body representation.
- Replayed or out-of-scope deliveries polluting selected-run state.
- Telegram push duplicates when both run events and advisory events change together.
- Assuming a stable public ingress endpoint exists when local development currently does not guarantee one.

## Pre-Implementation Approval
- Approved for docs-first implementation once delegated read-only review and docs-review confirm the ingress boundary, run-local state shape, and Telegram delta hooks.
- Reviewer: Codex.
- Date: 2026-03-06.
