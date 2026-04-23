# PRD - CO-315 release-runbook parity and docs:check truth coverage

## Added by Bootstrap 2026-04-23

## Traceability
- Linear issue: `CO-315` / `b2712a15-b04f-4a4e-aac8-35f614abb01b`
- Task id: `linear-b2712a15-b04f-4a4e-aac8-35f614abb01b`
- Canonical spec: `tasks/specs/linear-b2712a15-b04f-4a4e-aac8-35f614abb01b.md`
- Shared source 0 anchor: `ctx:sha256:08ac8534528c20e15c4bf7265a363da0a47f727b08fa91807f76e42ad0030574#chunk:c000001`
- Source object id: `sha256:08ac8534528c20e15c4bf7265a363da0a47f727b08fa91807f76e42ad0030574`
- Context dir: `.runs/linear-b2712a15-b04f-4a4e-aac8-35f614abb01b-docs-packet/cli/2026-04-23T00-51-01-276Z-b894da73/memory/source-0`
- Source payload: `.runs/linear-b2712a15-b04f-4a4e-aac8-35f614abb01b-docs-packet/cli/2026-04-23T00-51-01-276Z-b894da73/memory/source-0/source.txt`
- Origin manifest: `.runs/linear-b2712a15-b04f-4a4e-aac8-35f614abb01b-docs-packet/cli/2026-04-23T00-51-01-276Z-b894da73/manifest.json`
- Current release truth surfaces:
  - `skills/release/SKILL.md`
  - `.agent/SOPs/release.md`
  - `docs/release-notes-template-addendum.md`
  - `docs/README.md`
  - `.github/workflows/release.yml`
  - `docs/docs-catalog.json`
  - `scripts/docs-hygiene.ts`

## Summary
`CO-315` is a release-runbook parity lane. The current release truth is split across the bundled release skill, the maintainer SOP, `docs/README.md`, the release-notes addendum, and the release workflow itself. That split currently leaves the bundled release skill stale against the actual release SOP/workflow posture, and `npm run docs:check` does not normally fail when those release surfaces drift. As a result, maintainers can still need hidden repo knowledge for the real validation floor, signing secret posture, manual-dispatch tag semantics, overview override behavior, and OIDC-vs-`NPM_TOKEN` publish posture.

This lane stays narrowly scoped to two outcomes:
- refresh `skills/release/SKILL.md` so it matches the current release SOP/workflow truthfully
- extend release-surface truth coverage so drift in the release skill/SOP/addendum fails `npm run docs:check`

## User Request Translation
- Preserve the exact issue framing around release-runbook parity plus `docs:check` truth coverage.
- Treat the gap as a bounded parity problem: release truth already exists in the repo, but the bundled release skill and docs-check coverage do not fully reflect or enforce it.
- Keep the fix machine-checkable so normal docs validation fails when release drift reappears.
- Make acceptance explicit for:
  - validation floor
  - signing secret posture
  - manual-dispatch tag semantics
  - overview override behavior
  - OIDC-vs-`NPM_TOKEN` publish posture
- Keep the lane bounded. Do not redesign the release workflow, publish policy, or unrelated docs systems.

## Intent Checksum
- Protected terms and surfaces:
  - `skills/release/SKILL.md`
  - `.agent/SOPs/release.md`
  - `docs/release-notes-template-addendum.md`
  - `docs/README.md`
  - `.github/workflows/release.yml`
  - `docs/docs-catalog.json`
  - `scripts/docs-hygiene.ts`
  - `docs:check`
  - `workflow_dispatch`
  - `inputs.tag`
  - signed annotated tag body overview override
  - .github/release-overview.md is not read by the workflow
  - `RELEASE_SIGNING_PUBLIC_KEYS`
  - `RELEASE_SIGNING_ALLOWED_SIGNERS`
  - OIDC trusted publishing
  - `secrets.NPM_TOKEN`
  - `--provenance`
  - validation floor
- Nearby wrong interpretations to reject:
  - broad release-pipeline redesign
  - removing or replacing the tag-driven workflow
  - changing dist-tag policy
  - deprecating `NPM_TOKEN` fallback as part of this lane
  - treating this as a generic docs-freshness or docs-catalog cleanup
  - relying on maintainer tribal knowledge instead of a normal `docs:check` failure

## Parity / Alignment Matrix

| Surface | Current | Target |
| --- | --- | --- |
| Bundled release skill | `skills/release/SKILL.md` still carries partial or stale release guidance and does not fully mirror the current release SOP/workflow truth. | The bundled release skill becomes a truthful maintainer-facing runbook for the current release flow, without hidden repo knowledge. |
| Validation floor | The maintainer SOP carries the real release validation floor, while the release skill does not faithfully represent the same floor. | The release skill explicitly matches the current validation floor and package-artifact checks that the release SOP/workflow already require. |
| Signing posture | Workflow and SOP enforce signed-tag verification plus CI verification secrets, but that posture is not fully reflected across the release docs surfaces. | Release surfaces state the same signing contract: signed release machine actions plus exactly one CI verification secret family. |
| Manual dispatch semantics | The workflow defines that manual dispatch must resolve against an existing tag or `inputs.tag`, but that behavior is easy to miss unless the workflow YAML is read directly. | Release runbook docs state that manual dispatch is tag-bound, not a branch-based publish path. |
| Overview override | `docs/README.md`, the addendum, and the workflow contain the real release-note/overview behavior, but parity across release docs is incomplete. | Release surfaces consistently document the signed annotated tag body overview override, explicitly reject .github/release-overview.md as a workflow input, and preserve shipped-skills note placement. |
| Publish auth posture | `docs/README.md` and `.github/workflows/release.yml` document OIDC-first publish with `NPM_TOKEN` fallback, but the bundled release skill does not. | Release surfaces consistently describe OIDC-first trusted publishing, `--provenance`, and the constrained `NPM_TOKEN` fallback. |
| Docs validation | `docs:check` currently lacks release-runbook truth coverage for the release skill/SOP/addendum. | A normal `docs:check` run fails when the release skill/SOP/addendum drift on protected release truths. |

## Acceptance Criteria
- `skills/release/SKILL.md` is refreshed so the release runbook no longer omits or contradicts the current validation floor.
- The documented validation floor truthfully matches the current release SOP/workflow contract for pre-tag validation and package-artifact validation.
- The release runbook documents the signing secret posture accurately:
  - release commits/tags remain cryptographically signed on the release machine
  - CI verification requires exactly one of `RELEASE_SIGNING_PUBLIC_KEYS` or `RELEASE_SIGNING_ALLOWED_SIGNERS`
  - missing or dual secret configuration is documented as a release blocker
- The release runbook documents manual-dispatch tag semantics accurately:
  - `workflow_dispatch` must resolve to an existing release tag
  - `inputs.tag` is the manual-dispatch input when not already on a tag ref
  - the docs do not imply branch-based publish
- The release runbook documents overview override behavior accurately:
  - a signed annotated tag body is the optional one-shot override
  - the workflow does not read .github/release-overview.md
  - the release-notes addendum keeps shipped skill bullets and install/refresh guidance explicit
- The release runbook documents publish auth posture accurately:
  - OIDC trusted publishing is attempted first
  - npm publish uses `--provenance` on the OIDC path
  - `secrets.NPM_TOKEN` remains the fallback when OIDC is unavailable or fails
  - the fallback token must be an npm automation token rather than an OTP-gated token
- `npm run docs:check` fails when the release skill, release SOP, or release-notes addendum drift on the protected release truths above.
- Maintainers no longer need hidden repo knowledge from `.github/workflows/release.yml` or scattered README notes to perform a truthful release.

## Non-Goals
- No behavior change to `.github/workflows/release.yml`.
- No change to dist-tag semantics (`latest` vs prerelease tags).
- No change to npm auth policy beyond documenting the current posture truthfully.
- No general docs-catalog redesign outside the minimum release-surface coverage needed for `docs:check`.
- No release execution in this child lane.

## Not Done If
- The bundled release skill still requires maintainers to know hidden workflow/SOP details for the release process.
- Release drift can still accumulate across the release skill/SOP/addendum without a normal `docs:check` failure.
- Any of the five protected acceptance seams remain undocumented or contradictory.
- The lane broadens into release workflow redesign instead of parity plus machine-checkability.

## Metrics & Guardrails
- Primary success metrics:
  - `docs:check` fails on intentional drift in release skill/SOP/addendum for protected release truths
  - the bundled release skill reflects the current release runbook without hidden repo knowledge
  - release docs remain aligned on the same validation, signing, manual-dispatch, overview, and publish-auth facts
- Guardrails:
  - keep the change additive and release-doc focused
  - use machine-checkable truth extraction rather than reviewer memory
  - avoid changing actual release behavior in this lane

## User Experience
- A release maintainer can follow one truthful bundled skill/runbook instead of stitching together workflow YAML, SOP details, and README notes manually.
- Reviewers get a deterministic `docs:check` failure when release docs drift instead of finding the mismatch later during a release.
- The release-notes addendum stays part of the same enforceable release surface rather than optional tribal context.

## Technical Considerations
- The minimal parent implementation likely combines:
  - a bounded refresh of `skills/release/SKILL.md`
  - release-surface catalog coverage in `docs/docs-catalog.json`
  - a targeted release truth-check in `scripts/docs-hygiene.ts`
- The truth-check should derive release facts from existing repo truth (`.agent/SOPs/release.md`, `docs/README.md`, `.github/workflows/release.yml`, and the addendum) instead of relying on unstructured manual review.
- The release skill should stop referencing stale validation/review lanes that are not part of the current documented release floor.

## Open Questions
- Should the parent implement one composite `release-runbook-parity` truth check, or a small set of release-specific truth checks grouped under the same docs-hygiene surface?
- Should `docs/README.md` stay reference-only for the release parity check, or should it also gain explicit release truth-check coverage in the same pass?
- Is the minimum correct addendum check only overview/install guidance, or should it also assert the exact `Release Overview` section naming used by the workflow output?

## Approvals
- Product: Linear issue `CO-315`
- Engineering: pending parent lane acceptance, docs-review, and implementation validation
- Design: N/A
