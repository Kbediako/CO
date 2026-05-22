# PRD: CO-578 Review-Owned Active Manifest Snapshots

## Summary
- Problem Statement: Governed review contract validation can self-invalidate a clean review when `agent-loop-bundle.json` exposes the mutable active run `manifest.json` or runner log as nested `source_refs` and the reviewer cites those live files.
- Desired Outcome: Review contract input preserves the active run state in immutable review-owned snapshots so every cited `evidence_ref` remains byte-stable while strict SHA validation stays fail-closed.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): Complete Linear issue CO-578 by fixing the review-wrapper evidence contract defect, preserving no-fallback validation semantics, and handing off only after documented, validated, review-ready evidence.
- Success criteria / acceptance: Agent-loop active manifest and runner-log evidence must be cited through review-owned immutable input snapshots; mutable live manifest citations must be absent or deterministically invalid; focused regressions must prove snapshot citations survive later active manifest mutation; docs must describe the citation rule.
- Constraints / non-goals: Do not weaken `validateEvidenceRefs(...)`, disable contract validation, globally exempt active manifests, or rely only on prompt wording.

## Intent Checksum
- Exact user wording / phrases to preserve: "governed review contract", "active run manifest", "mutable manifest evidence", "immutable review input snapshot", "agent-loop-bundle", "evidence_refs", "sha256 validation", "fail-closed review gate", "no tolerance fallback", "no active-manifest citation".
- Protected terms / exact artifact and surface names: `scripts/lib/review-contract.ts`, `scripts/run-review.ts`, `review/inputs/agent-loop-bundle.json`, `review/contract.json`, `review/telemetry.json`, `.runs/**/manifest.json`, `runner.ndjson`, `validateEvidenceRefs(...)`.
- Nearby wrong interpretations to reject: Do not make evidence hashes optional, accept stale active-manifest hashes by tolerance, retry reviews as the fix, depend on manual reviewer phrasing, or treat `findings: []` as clean without a valid explicit contract.

## Parity / Alignment Matrix
- Current truth: Agent-loop bundles embed active manifest content but also expose live manifest and runner-log paths as nested `source_refs`.
- Reference truth: Contract evidence validation is strict and hashes every cited `evidence_ref` at validation time.
- Target truth / intended delta: Active run state used by agent-loop review is copied into immutable `review/inputs/**` snapshots before handoff, and nested source refs point at those snapshots instead of mutable live artifacts.
- Explicitly out-of-scope differences: Ordinary file evidence remains strict; docs-review transport remains governed; CO-549 implementation behavior is not changed by this issue.

## Not Done If
- Reviewers can still cite a mutable active run manifest from generated bundle source refs and self-invalidate a clean contract after wrapper finalization.
- Validation accepts stale hashes for mutable manifests by tolerance.
- The fix is prompt-only without deterministic bundle or test enforcement.
- The agent-loop bundle loses the manifest/proof information needed to review producer-loop behavior.

## Goals
- Snapshot mutable active run manifest and runner-log evidence into review-owned inputs.
- Keep agent-loop bundle content sufficient for review while making nested refs immutable by construction.
- Preserve strict `validateEvidenceRefs(...)` behavior for every cited path.
- Document the active-run-state citation rule for standalone review authors and reviewers.

## Non-Goals
- No global hash tolerance, active-manifest exemption, or waiver-first review path.
- No CO-549 product implementation change.
- No broad review contract redesign beyond this evidence source seam.

## Stakeholders
- Product: CO control/review lifecycle owners.
- Engineering: Review-wrapper, docs-review, provider-worker, and contract-validation maintainers.
- Design: Not applicable.

## Metrics & Guardrails
- Primary Success Metrics: Focused regression proves a contract citing the snapshot remains valid after the original active manifest mutates; direct live manifest citation is absent from bundle source refs or invalid.
- Guardrails / Error Budgets: Contract validation must stay fail-closed for stale SHA evidence; generated bundles must remain review-useful and deterministic enough for tests.

## User Experience
- Personas: Provider workers, review agents, and maintainers consuming `review/telemetry.json`.
- User Journeys: A worker runs governed review, the reviewer cites the agent-loop bundle or nested refs, and validation remains clean if the review is semantically clean even after manifest finalization mutates live state.

## Technical Considerations
- Architectural Notes: The review wrapper already owns `review/inputs`; copy active mutable evidence there before assembling `agent-loop-bundle.json`.
- Dependencies / Integrations: `prepareReviewContractInputBundles(...)`, `buildAgentLoopBundle(...)`, `validateEvidenceRefs(...)`, focused Vitest coverage, and `docs/standalone-review-guide.md`.

## Fallback / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? `Yes`, because this removes a stale mutable-evidence seam.
- Large-refactor decision: A narrow fix is acceptable because authority is not split across multiple lifecycle phases; the seam is localized to input bundle construction and evidence refs, while the strict validator remains unchanged.
- Minor-seam decision: This issue removes the stale mutable-evidence seam directly instead of adding another compatibility branch.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| review contract agent-loop input | Mutable active manifest/runner-log citation seam | remove fallback | CO-578 | Generated nested refs point at live active artifacts | before 2026-05-22 | 2026-05-22 | Removed in CO-578 | Generated agent-loop refs point at immutable review-owned snapshots and embedded bundle content is read from the same snapshots | Focused mutation regression, manifest-backed review, and full gates |

## Open Questions
- None blocking; child-lane regression work may refine exact snapshot filenames.

## Approvals
- Product: Linear CO-578 issue packet.
- Engineering: Provider worker self-approval from issue-quality review before implementation.
- Design: Not applicable.
