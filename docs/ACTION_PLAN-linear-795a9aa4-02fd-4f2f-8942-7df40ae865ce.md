# ACTION_PLAN: CO-578 Review-Owned Active Manifest Snapshots

## Summary
- Goal: Remove the mutable active-manifest evidence race from governed review contract validation.
- Scope: Review contract input bundle construction, focused regression tests, standalone-review guidance, task packet mirrors, and review/PR handoff.
- Assumptions: The strict validator is correct; only mutable source-ref construction is defective.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: governed review contract, active run manifest, mutable manifest evidence, immutable review input snapshot, agent-loop-bundle, evidence_refs, sha256 validation, fail-closed review gate, no tolerance fallback, no active-manifest citation.
- Not done if: Live active manifests are still emitted as nested source refs, stale hashes are accepted by tolerance, or docs alone carry the rule.
- Pre-implementation issue-quality review: The Linear issue packet is sufficiently specific and includes acceptance criteria, non-goals, root-cause source pointer, current evidence, and related blockers.
- Fallback / refactor decision: This touches stale mutable-evidence behavior; choose `remove fallback` for the active-manifest/runner-log citation seam in `buildAgentLoopBundle(...)`.
- Durable retention evidence: Not applicable because no fallback is retained.
- Large-refactor decision: A narrow bundle-construction change is acceptable because validator authority stays centralized and strict.
- Minor-seam decision: The active-manifest/runner-log citation seam is removed by snapshot construction rather than retained behind a new fallback or prompt-only rule.

## Fallback / Refactor Decision

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| review contract agent-loop input | Mutable active manifest/runner-log citation seam | remove fallback | CO-578 | Generated nested refs point at live active artifacts | before 2026-05-22 | 2026-05-22 | Removed in CO-578 | Generated agent-loop refs point at immutable review-owned snapshots and embedded bundle content is read from the same snapshots | Focused mutation regression, manifest-backed review, and full gates |

## Milestones & Sequencing
1. Open issue execution: read live Linear context, create one workpad, transition to `In Progress`, record parallelization, and launch a bounded tests child lane.
2. Docs-first packet: create PRD, TECH_SPEC, ACTION_PLAN, task checklist, agent mirror, registry/index entries, and run docs-review before implementation.
3. Regression first: accept or reproduce focused failing coverage for snapshot refs and direct mutable manifest citation behavior.
4. Implementation: snapshot active manifest and runner-log inputs into `review/inputs/`, point agent-loop refs at snapshots, and preserve embedded content.
5. Validation/handoff: run required gates, standalone review, elegance review, PR attach, ready-review drain, and refresh workpad before `In Review`.

## Dependencies
- Same-issue child lane `contract-regression-tests` owns focused tests until parent disposition.
- CO-549 remains blocked until this review-wrapper defect lands or a one-time waiver is recorded.

## Validation
- Checks / tests:
  - Focused review-contract red/green regression.
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `npm run repo:stewardship`
  - `node scripts/diff-budget.mjs`
  - Manifest-backed `codex-orchestrator review` with clean valid contract.
  - Explicit elegance/minimality pass.
- Rollback plan: Revert the bundle-construction and docs/test changes; strict validation remains unchanged.

## Risks & Mitigations
- Risk: Snapshot filenames become unstable or confusing. Mitigation: Use explicit review input names and verify source refs in tests.
- Risk: Runner log absence changes behavior. Mitigation: Keep existing nullable runner-log behavior and only snapshot when present.
- Risk: Child-lane test edits overlap parent implementation. Mitigation: Parent avoids delegated test files until child patch disposition.

## Approvals
- Reviewer: Provider worker self-review from Linear issue packet.
- Date: 2026-05-22
