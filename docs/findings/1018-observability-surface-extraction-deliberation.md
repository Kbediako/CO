# Findings - 1018 Observability Surface Extraction Deliberation

## Decision
- Proceed with a narrow Symphony-inspired observability-surface extraction as the next slice after `1017`.

## Why This Slice
- Real Symphony keeps its observability controller thin and delegates state/issue/refresh payload shaping to a presenter layer.
- `1017` gave CO the missing selected-run projection seam, so the next high-value reduction is to move the read-only HTTP response shaping off `controlServer.ts`.
- This increases reuse for future downstream-user status surfaces without touching authority, webhook ingress, or mutation behavior.

## Explicit Non-Goals
- No control mutation changes.
- No Telegram direct-rendering rewrite in this slice.
- No `/api/v1/dispatch` redesign unless the minimal extraction requires a tiny supporting adjustment.
- No unattended tracker authority or scheduler adoption from Symphony.
