# ACTION_PLAN - CO-529 archived registry rows require stubs or retained lifecycle evidence

## Summary
- Goal: prevent hidden full-doc archive drift by enforcing archive-stub or retained-history proof for every `status=archived` registry row.
- Scope: docs-first packet, current-main classification, RED/GREEN docs-freshness/archive tests, minimal invariant implementation, current registry repair, validation, PR lifecycle.
- Assumptions: current `origin/main` includes PR #900 and the original PR #800 TECH_SPEC example is now a valid archive stub; remaining non-stub archived rows still need classification.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: implementation-docs archive automation, `docs/docs-freshness-registry.json`, `status=archived`, `<!-- docs-archive:stub -->`, `Full content`, `Archive branch`, `Archive path`, `allow_registry_only`, registry-only archival, `preserved_historical_stub`, `retained_terminal_packet`, docs:freshness, PR #800, Codex P2.
- Not done if: archived registry rows can hide full on-main docs without valid stub or retained/historical proof; `allow_registry_only` can introduce the same hidden state; tests do not cover current-main row truth.
- Pre-implementation issue-quality review: parent reviewed live CO-529 issue-context, current queue/PR state, current-main registry scan, and selected CO-529 as the next P1 lane with WIP cap clear.
- Fallback / refactor decision: this task touches archive/freshness lifecycle seam behavior and removes the implicit archived-status bypass. It does not retain a temporary fallback.
- Durable retention evidence: not applicable; unsafe hidden archive fallback is removed.
- Large-refactor check: targeted invariant is acceptable because archive-stub parsing and retained lifecycle statuses already exist.

## Decomposition Matrix

| Candidate lane | File / phase scope | Dependencies | Overlap risk | Expected validation artifact | Child-lane owner | Cap-slot use |
| --- | --- | --- | --- | --- | --- | --- |
| docs-packet | PRD, TECH_SPEC, ACTION_PLAN, task checklist, agent mirror, registries | live issue contract | Medium: docs must match implementation and repair class | docs-review manifest | parent | 0 |
| archive-invariant research | registry rows, archive-stub helpers, docs-freshness tests | current-main scan | High: classifications drive implementation and tests | RED test target notes | parent | 0 |
| implementation-tests | docs-freshness/archive scripts and tests | RED test first | High: same files as research | focused vitest output | parent | 0 |
| review/validation | deterministic gates, PR checks, ready-review | final diff | Medium | manifest and PR evidence | parent | 0 |

Decision: `stay_serial` / `overlapping_scope`. Delegation transport closed during the attempted queue-audit stream, and the remaining streams share the same archive-registry classification surface.

## Milestones & Sequencing
1. Create docs-first packet, registry mirrors, workpad, and docs-review evidence.
2. Classify current non-stub archived rows into valid stubs, retained classes, historical/archive references, and invalid full-doc rows.
3. Write RED focused regression for a full archived row with no stub/retained proof.
4. Implement the minimal guard and row repair.
5. Validate focused tests, docs gates, repo gates, review, PR checks, and ready-review.

## Dependencies
- Existing `scripts/lib/archive-stub.js` validation.
- Existing docs-freshness lifecycle statuses: `archived`, `preserved_historical_stub`, `retained_terminal_packet`, and `terminal_pending_archive`.
- Existing archive automation input `allow_registry_only`.

## Validation
- Checks / tests: focused docs-freshness/archive tests, `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `npm run docs:freshness`, `npm run docs:freshness:maintain -- --format json`, `npm run repo:stewardship`, `node scripts/diff-budget.mjs`, standalone review, and `npm run pack:smoke` if archive scripts are release-facing.
- Rollback plan: revert the CO-529 branch before merge; registry row repair is local until PR merge.

## Risks & Mitigations
- Risk: over-classifying historical references as invalid. Mitigation: allow only explicit retained/history classes and document each current-row repair.
- Risk: huge registry churn. Mitigation: prefer status metadata repair over content stubbing unless archive payload evidence exists.
- Risk: existing docs-freshness baseline becomes blocked by many rows. Mitigation: repair current rows in the same PR that introduces the guard.

## Approvals
- Reviewer: parent CO orchestrator
- Date: 2026-05-26
