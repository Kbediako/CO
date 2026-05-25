# PRD - CO-585 review docs freshness public and spec pre-expiry batch

## Added by Bootstrap 2026-05-25

## Summary
- Problem Statement: After CO-584 repaired malformed docs-freshness registry lifecycle rows, `docs:freshness:maintain --check --format json` now blocks at `block_spec_guard_pre_expiry` for two public guides and ten active specs approaching the 2026-06-01 review boundary.
- Desired Outcome: Perform real review and routing for the named public docs and active specs, update only truthful review metadata, preserve fail-closed docs/spec behavior, and leave any unrelated rolling or terminal lifecycle residue under its own owner.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): The user wants the exposed pre-expiry docs-freshness batch handled as a review task, not patched by blind date bumps or absorbed into unrelated freshness owners.
- Success criteria / acceptance: The current main baseline reproduces `block_spec_guard_pre_expiry`; each listed public and spec path is reviewed against current implementation and behavior; truthful `last_review` values are updated; `docs:freshness:maintain --check --format json` no longer blocks on this batch or reports only separately owned residue.
- Constraints / non-goals: Do not weaken `docs:freshness`, `docs:freshness:maintain`, or `spec-guard`; do not delete historical docs; do not blind-bump dates; do not expand CO-579, CO-581, CO-569, or any other rolling owner beyond its exact cohort.

## Intent Checksum
- Exact user wording / phrases to preserve: "review docs freshness public and spec pre-expiry batch"; "real review and routing"; "must not blind-bump `last_review`, weaken `docs:freshness` or `spec-guard`, delete historical docs, or absorb unrelated rolling cohort residue."
- Protected terms / exact artifact and surface names: `docs:freshness:spec-and-public-pre-expiry:2026-06-01`, `codex-orchestrator:canonical-owner-key=docs:freshness:spec-and-public-pre-expiry:2026-06-01`, `block_spec_guard_pre_expiry`, `docs/public/downstream-setup.md`, `docs/public/provider-onboarding.md`, `tasks/specs/linear-34faa7f9-640b-494f-af58-47096b6d0541.md`, `tasks/specs/linear-6a92b5d9-3293-4e27-9bc5-28c8c62becfc.md`, `tasks/specs/linear-75023431-9350-4e9a-982e-71d244cbf204.md`, `tasks/specs/linear-77fc72a8-6cc4-4a47-84cd-7b0dfd18bfaf.md`, `tasks/specs/linear-7badbb88-ab4b-4091-9cd1-5d74643b6443.md`, `tasks/specs/linear-88a7529f-c7fa-443d-8b64-87b6b45ef312.md`, `tasks/specs/linear-b7381274-d6eb-4886-86f4-3976b154c26d.md`, `tasks/specs/linear-c21c8833-ce10-4c5d-a12f-e309bf6ffe3f.md`, `tasks/specs/linear-dc1c7783-0307-4a0a-8dcf-2ede6a889392.md`, `tasks/specs/linear-de299bad-c345-4259-8551-73dd429eccca.md`.
- Nearby wrong interpretations to reject: This is not a global docs-freshness cleanup, not a rolling-cohort cap issue, not a task to mark terminal lifecycle debt clean, and not a permission to rewrite historical implementation docs.

## Parity / Alignment Matrix
| Surface | Current truth | Reference truth | Target truth / intended delta | Explicitly out-of-scope differences |
| --- | --- | --- | --- | --- |
| Public docs freshness | `docs/public/downstream-setup.md` and `docs/public/provider-onboarding.md` are pre-expiry with last review before the current runtime authority posture. | Public setup/onboarding docs should reflect current provider-worker and runtime guidance without claiming unsupported direct starts. | Both public docs are reviewed; provider onboarding receives a focused runtime authority clarification; registry review dates are updated with evidence. | No broad public-doc rewrite and no unrelated install/setup redesign. |
| Active spec freshness | Ten active specs are seven days from expiry and still represent live CO contracts. | Active specs should carry current review evidence tied to implementation/test anchors. | Each spec records a 2026-05-25 review note and task-index/registry review metadata is updated truthfully. | No code behavior changes unless review uncovers a concrete defect. |
| Freshness routing | The next deterministic blocker is the 2026-06-01 pre-expiry batch. | The pre-expiry owner should clear only its named batch and leave other owner debt visible. | `docs:freshness:maintain --check --format json` advances beyond `block_spec_guard_pre_expiry` to pass or separately owned residue. | No ownership broadening for CO-579, CO-581, CO-569, or terminal lifecycle rows. |

## Not Done If
- `docs:freshness:maintain --check --format json` still reports `block_spec_guard_pre_expiry` for this named batch.
- Any `last_review` changes without a review note, code/test anchor, or public-doc content review.
- `spec-guard` or docs freshness checks are weakened or bypassed.
- Unrelated rolling or terminal lifecycle residue is hidden under CO-585.

## Goals
- Reproduce the CO-584 post-repair `block_spec_guard_pre_expiry` baseline.
- Review the two public docs and ten active specs against current repo behavior.
- Update docs/specs and registry/task metadata only where review evidence exists.
- Preserve strict validation and owner routing.

## Non-Goals
- No global docs freshness cleanup.
- No historical packet deletion.
- No code-path implementation unless the review finds a live defect.
- No transfer of unrelated owner debt into CO-585.

## Stakeholders
- Product: CO operators relying on docs freshness as an owner-routing control.
- Engineering: Codex orchestrator maintainers and provider-worker implementers.
- Design: Not applicable.

## Metrics & Guardrails
- Primary Success Metrics: The pre-expiry batch count for CO-585 drops to zero; `spec-guard` remains green; `docs:freshness:maintain --check --format json` reports only pass or separately owned residue.
- Guardrails / Error Budgets: No blind review-date bumps; no validation weakening; no unrelated owner changes; no more than the supported same-issue child-lane cap is consumed.

## User Experience
- Personas: Provider-worker operator, reviewer, and future CO maintainer triaging docs freshness output.
- User Journeys: Operator sees the CO-585 canonical owner clear its exact public/spec pre-expiry batch and can trust any remaining docs-freshness blocker as a separate route.

## Technical Considerations
- Architectural Notes: This is a docs/spec review lane. Existing implementation and tests are the review anchors; metadata updates must follow evidence rather than drive the evidence.
- Dependencies / Integrations: `docs/docs-freshness-registry.json`, `tasks/index.json`, `docs/public/*`, `tasks/specs/*`, `scripts/spec-guard.mjs`, and `scripts/docs-freshness-maintain.mjs`.

## Fallback / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? Yes, because provider onboarding documents the existing `codex exec` / `codex exec resume` break-glass path.
- Decision: justify retaining the break-glass documentation as an explicitly scoped fallback while app-server authority remains the normal provider-worker path.
- Large-refactor check: No large code refactor is indicated. The review updates docs/spec evidence and one public guide clarification; authority remains centralized in existing provider-worker runtime contracts.

## Open Questions
- None blocking. Remaining docs-freshness output after this batch should be classified by its emitted canonical owner rather than folded into CO-585.

## Approvals
- Product: Codex operator on 2026-05-25.
- Engineering: Pending implementation review.
- Design: Not applicable.
