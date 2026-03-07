# Findings - 1044 Security Violation Controller Extraction Deliberation

- Date: `2026-03-07`
- Decision: approve docs-first planning for the next bounded controller seam.

## Why This Slice

- `1043` removed the standalone `/questions*` branch from `controlServer.ts`, leaving `/security/violation` as the next smallest cohesive HTTP route still inline.
- The security-violation route is bounded around one narrow concept: accept a redacted violation report, emit the audit event, and return a simple recorded response.
- Extracting it now continues the Symphony-aligned controller thinning without widening into the higher-risk `/delegation/register`, `/confirmations*`, or `/control/action` authority paths.

## Delegated Boundary Note

- A delegated read-only seam review confirmed `/security/violation` as the next smallest Symphony-aligned extraction target after `1043`.
- The key regression surface to preserve is the current redacted event payload defaulting plus the stable `200 { status: "recorded" }` response contract.
