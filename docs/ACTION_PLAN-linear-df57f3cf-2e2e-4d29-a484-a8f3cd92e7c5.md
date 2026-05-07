# ACTION_PLAN - CO-511 docs:freshness:maintain packet for CO-102 rows

## Summary
- Goal: complete the CO-511 `docs:freshness:maintain` terminal owner replacement lane involving historical CO-102 packet rows with `last_review=2026-04-06`, while preserving the accepted docs-first child packet.
- Scope: accepted child packet plus parent-owned owner metadata, registry mirrors, completed-lane source-spec reclassification, validation, PR, workpad, and Linear lifecycle.
- Assumptions:
  - the accepted child lane owned only the six packet files
  - the parent owns live owner-state reads, owner metadata, registry mirrors, completed-lane reclassification, validation, PR, workpad, and Linear lifecycle
  - `last_review=2026-04-06` is protected evidence, not an automatic refresh target
  - CO-511 must remain distinct from CO-507

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `docs:freshness:maintain`
  - canonical owner key
  - clean-main baseline
  - terminal owner replacement
  - CO-102 packet rows
  - `last_review=2026-04-06`
  - validation gate
- Not done if:
  - scoped packet files are missing or omit protected terms
  - blind `last_review` bumps are used, allowed, or cited as validation evidence
  - historical CO-102 packet deletion is used to pass freshness checks
  - docs freshness/spec-guard behavior or validation gate semantics are weakened
  - CO-511 is folded into CO-507
  - the parent-owned registry, owner, completed-lane reclassification, workpad, PR, Linear, or validation surfaces lack live CO-511 evidence
- Pre-implementation issue-quality review:
  - 2026-05-07: the issue is not narrower than packet creation because the child scope explicitly asks for the docs-first packet only and delegates owner metadata, validation, and lifecycle work to the parent.
  - 2026-05-07: the parent lane issue is broader than packet creation because it must restore live canonical owner evidence and prove the validation gate is clean.
  - 2026-05-07: micro-task path is unavailable because correctness depends on exact protected terms and owner/validation boundaries.
- Fallback / refactor decision: `remove fallback` for the historical CO-102 packet-row freshness seam; the parent must classify the rows under live owner evidence and leave no expired fallback before handoff.
- Durable retention evidence: CO-102 packet rows and `last_review=2026-04-06` stay visible as historical evidence, but the parent must archive or reclassify their active freshness status rather than retaining an expired fallback.
- Large-refactor decision: bounded metadata repair; no large refactor is warranted because CO-511 removes the stale active freshness seam for this completed-lane residue instead of adding another owner-routing branch.
- Minor-seam decision: remove the minor docs-freshness seam now by archiving or reclassifying the April 6 completed-lane rows under live CO-511 owner evidence.

## CO-382 Fallback Decision Table

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `docs:freshness:maintain` | Historical CO-102 packet rows with `last_review=2026-04-06` | `remove fallback` | CO-511 parent lane | Terminal owner replacement plus clean-main baseline validation gate | 2026-04-06 | 2026-05-07 | Removed on 2026-05-07 | Completed-lane packet/spec rows are archived or reclassified under live CO-511 owner evidence, with no retained fallback before handoff | Parent-owned `docs:freshness:maintain -- --format json`, `npm run docs:freshness`, and `node scripts/spec-guard.mjs --dry-run` |

## Milestones & Sequencing
1. Draft PRD, TECH_SPEC mirror, ACTION_PLAN, canonical task spec, task checklist, and `.agent/task` mirror.
2. Verify the six scoped files exist and include protected terms.
3. Leave the working tree changes in place for parent patch export.
4. Parent imports the patch, updates owner/registry mirrors, reclassifies completed-lane rows with live evidence, captures clean-main baseline evidence, runs the validation gate, and owns PR/Linear lifecycle.
5. Parent addresses PR review feedback, including canonical-spec alignment and `completed_at` evidence for completed rows.

## Dependencies
- CO-511 parent lane.
- Source anchor `ctx:sha256:1998b27dfb57df81c7bce5beae2cce65c7f18b7398366940d62586fab83b5599#chunk:c000001`.
- Parent-owned `docs:freshness:maintain` and validation gate.

## Validation
- Child checks:
  - scoped file existence
  - protected-term scan across the six packet files
  - `git diff --check`
- Parent checks:
  - registry/index synchronization for the packet
  - live owner marker and terminal-owner replacement evidence
  - completed-lane row reclassification with `completed_at` where applicable
  - clean-main baseline proof
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run docs:freshness`
  - `npm run docs:freshness:maintain -- --format json`
  - review and PR lifecycle gates
- Rollback plan:
  - parent can reject or omit only the six packet files if the packet scope is superseded.

## Risks & Mitigations
- Risk: child packet limits are mistaken for parent lane limits.
  - Mitigation: packet surfaces now distinguish accepted child scope from parent-owned metadata, registry mirrors, reclassification, validation, PR, workpad, and Linear lifecycle.
- Risk: `last_review=2026-04-06` is treated as a blind bump target.
  - Mitigation: Not Done If rejects blind `last_review` bumps and historical CO-102 packet deletion.
- Risk: the lane is folded into CO-507.
  - Mitigation: CO-507 folding is listed as a rejected interpretation and Not Done If condition.

## Approvals
- Reviewer: CO-511 parent lane
- Date: 2026-05-07
