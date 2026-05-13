# Findings - 1015 Selected-Run Projection Deliberation

## Decision
- Proceed with a projection-first slice that centralizes selected-run shaping before any broader Telegram or Linear surface expansion.

## Why This Slice Now
- `1014` already landed the provider-backed adapter layer.
- The current quality gap is coherence across state/issue/UI/Telegram, especially once live Linear fetch and non-running run states are involved.
- The user explicitly approved the next slice, future slices, and real Linear configuration work.

## Accepted Direction
- Add one shared selected-run context builder on the control side.
- Allow it to be async so live Linear resolution and projection are aligned per request.
- Keep Linear tracked-only and Telegram bounded to the existing oversight/control contract.

## Rejected Alternatives
- Adding webhook ingress first:
  - rejected because projection coherence is a lower-risk dependency and the user specifically endorsed the async control-server path.
- Expanding Telegram into a broader mutating shell:
  - rejected because it would widen authority beyond the current guardrails.
- Making Linear authoritative or mutation-capable:
  - rejected because it conflicts with the closed coordinator boundaries and the prior task decisions.

## Risks To Watch
- Stale async advisory responses rendering against the wrong run snapshot.
- State/issue/UI/Telegram keeping slightly different render logic after the builder lands.
- Overfitting to Symphony's UI conventions instead of CO's authority model.

## Pre-Implementation Approval
- Approved for docs-first implementation once delegated read-only review confirms the minimal builder boundary and test gaps.
- Reviewer: Codex.
- Date: 2026-03-06.
