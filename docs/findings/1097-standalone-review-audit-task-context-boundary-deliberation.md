# 1097 Deliberation - Standalone Review Audit Task-Context Boundary

## Decision

- Approved as the next bounded review-reliability slice immediately after `1096`.
- Keep the seam inside `scripts/run-review.ts` audit-mode prompt shaping only.

## Why This Slice

- `1095` solved audit evidence parity, but the live audit review still widened into broader task/history inspection after the prompt injected checklist and PRD content.
- `1096` closed cleanly and confirmed the next product seam can wait one slice while the review wrapper becomes less drift-prone.
- Narrowing audit task context is smaller and safer than reopening classifier logic or replacing the wrapper.

## Evidence

- `out/1095-coordinator-symphony-aligned-standalone-review-audit-supporting-evidence-parity/manual/20260310T050300Z-closeout/09-review.log`
- `out/1095-coordinator-symphony-aligned-standalone-review-audit-supporting-evidence-parity/manual/20260310T050300Z-closeout/00-summary.md`
- `out/1096-coordinator-symphony-aligned-authenticated-route-branch-shell-extraction/manual/20260309T182942Z-closeout/14-next-slice-note.md`

## Boundaries

- Do not change `review-execution-state.ts`.
- Do not change diff-mode prompt shaping.
- Do not open the next `controlServer.ts` product seam until this wrapper slice lands.
