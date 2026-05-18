# PRD - CO-314 release notes Overview/Bug Fixes parity and prerelease docs truth

## Added by Docs Child Lane 2026-04-23

## Traceability
- Linear issue: `CO-314` / `e2852b4f-09d0-4220-b0ac-b763170eacb2`
- MCP Task ID: `linear-e2852b4f-09d0-4220-b0ac-b763170eacb2`
- Canonical task ID: `20260423-linear-e2852b4f-09d0-4220-b0ac-b763170eacb2`
- Canonical TECH_SPEC: `tasks/specs/linear-e2852b4f-09d0-4220-b0ac-b763170eacb2.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-e2852b4f-09d0-4220-b0ac-b763170eacb2.md`
- Task checklist: `tasks/tasks-linear-e2852b4f-09d0-4220-b0ac-b763170eacb2.md`
- Agent-task mirror: `.agent/task/linear-e2852b4f-09d0-4220-b0ac-b763170eacb2.md`
- Source anchor: `ctx:sha256:02cb90d54135011ef937fd18a3991df0f28287d0192ad00e24a2f90a2d4cffb8#chunk:c000001`
- Docs packet child lane manifest: `.runs/linear-e2852b4f-09d0-4220-b0ac-b763170eacb2-docs-packet/cli/2026-04-23T05-57-00-647Z-0bd37fd5/manifest.json`
- Source payload note: the declared `.runs/.../memory/source-0/source.txt` payload is not present in this child checkout because the lane workspace has no `.runs` tree. The packet is anchored on the parent-provided issue wording plus current repo source audit only.

## Summary
- Problem Statement: the release workflow and release-facing docs are not aligned on generated release-note truth. `.github/workflows/release.yml` promotes generated `Overview` and `Bug Fixes` sections into canonical release-note sections, but the current workflow only strips `Overview` from `Full Changelog`, leaving promoted `Bug Fixes` vulnerable to duplication. The docs also simplify prerelease publishing as alpha-only even though the workflow derives prerelease `dist-tag` values from the prerelease label, and the optional .github/release-overview.md override needs one-shot, stale-safe handling.
- Desired Outcome: the parent lane should make release notes and release docs truthful and deterministic: canonical `Overview` / `Bug Fixes` promotion is de-duplicated from `Full Changelog`, prerelease `dist-tag` documentation matches workflow derivation, the signed annotated tag body is the one-shot overview override, and `docs/README.md` plus `.agent/SOPs/release.md` match `.github/workflows/release.yml`.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): create the docs-first packet and checklist/registry mirrors for `CO-314`, preserving the exact release-note surfaces and PR `#608` review notes before parent implementation.
- Success criteria / acceptance:
  - encode the `Overview`, `Bug Fixes`, and `Full Changelog` release-note contract before implementation
  - require canonical promotion of generated `Overview` and `Bug Fixes` into top-level release sections without duplicating promoted content in `Full Changelog`
  - require docs to state the real prerelease `dist-tag` derivation from `.github/workflows/release.yml`, not only the alpha example
  - require the signed annotated tag body to be the one-shot overview override and keep .github/release-overview.md from shaping release notes
  - require `docs/README.md` and `.agent/SOPs/release.md` to stay in parity with `.github/workflows/release.yml`
  - carry forward PR `#608` review notes: `.agent/SOPs/release.md` must reference `.github/workflows/release.yml`, and checklist wording must name `Overview` / `Bug Fixes` while separating initial diff-budget evidence from final review-wrapper rerun evidence
- Constraints / non-goals:
  - this child lane owns only the declared docs packet, task mirror, registry, and docs freshness files
  - parent owns implementation, Linear state, workpad, review, PR lifecycle, and merge
  - do not edit release workflow, release docs, tests, package files, or parent scratch files in this child lane
  - do not run full repo validation suites in this child lane

## Intent Checksum
- Exact user wording / phrases to preserve:
  - `docs/release-notes-template-addendum.md`
  - `.github/workflows/release.yml`
  - .github/release-overview.md
  - `docs/README.md`
  - `.agent/SOPs/release.md`
  - `Overview`
  - `Bug Fixes`
  - `Full Changelog`
  - prerelease `dist-tag` derivation
  - PR `#608`
- Protected terms / exact artifact and surface names:
  - `docs/release-notes-template-addendum.md`
  - `.github/workflows/release.yml`
  - `.github/release.yml`
  - .github/release-overview.md
  - `docs/README.md`
  - `.agent/SOPs/release.md`
  - `Overview`
  - `Bug Fixes`
  - `Full Changelog`
  - `release-notes.md`
  - `DIST_TAG`
  - `latest`
  - `alpha`
  - `next`
  - prerelease `dist-tag` derivation
- Nearby wrong interpretations to reject:
  - treating the issue as a release publication or npm publish task
  - changing package version, tag signing, or trusted publishing policy as part of this issue
  - documenting prerelease publishing as always `alpha` when `.github/workflows/release.yml` derives the tag from the prerelease label
  - using .github/release-overview.md as a persistent evergreen summary that can silently affect future releases
  - fixing only `docs/release-notes-template-addendum.md` while leaving `docs/README.md` and `.agent/SOPs/release.md` stale
  - leaving initial diff-budget evidence and final review-wrapper rerun evidence collapsed into one checklist item

## Parity / Alignment Matrix

| Surface | Current Truth | Reference Truth | Target Truth |
| --- | --- | --- | --- |
| `.github/workflows/release.yml` release-note generation | extracts generated `### Overview`, optionally overrides it from .github/release-overview.md, extracts generated `### Bug Fixes`, strips only `Overview`, and writes `## Release Overview`, `## Bug Fixes`, and `## Full Changelog` | promoted generated sections should appear once in canonical release-note positions | generated `Overview` and `Bug Fixes` are promoted once, and `Full Changelog` keeps remaining generated notes plus compare metadata without duplicating promoted sections |
| `.github/release.yml` | defines generated categories `Overview`, `Bug Fixes`, `Dependencies`, `Documentation`, `Chores`, and `Other Changes` | generated category names are the source labels the workflow promotes | target promotion preserves exact `Overview` and `Bug Fixes` names and leaves non-promoted categories under `Full Changelog` |
| .github/release-overview.md | optional file is absent in this checkout; workflow uses it whenever a non-empty file exists in the release tag commit | override should be deliberate for one release, not stale carried text | parent repair removes workflow dependence on this committed file and uses the signed annotated tag body as the one-shot override |
| prerelease `dist-tag` derivation | stable tags emit `latest`; prerelease tags derive `DIST_TAG` from the lowercased prerelease label before first `.` or `-`, sanitized, with empty or numeric-leading labels falling back to `next` | release docs should match workflow behavior exactly | `docs/README.md` and `.agent/SOPs/release.md` describe real derivation, including `vX.Y.Z-alpha.N -> alpha`, other labels such as beta/rc, and fallback `next` |
| `docs/release-notes-template-addendum.md` | tells maintainers to include shipped skills bullets under `Overview` or `Documentation` | addendum should match the promoted release-note contract | addendum remains compatible with canonical `Overview` / `Bug Fixes` promotion and points maintainers at the workflow/docs contract as needed |
| `docs/README.md` | mentions .github/release-overview.md and says alpha prereleases publish to `alpha` | docs should be truthful for all supported prerelease labels | README release guidance matches `.github/workflows/release.yml` and the one-shot override behavior |
| `.agent/SOPs/release.md` | references `.github/workflows/release.yml`, says alpha tags publish to `alpha`, and says remove .github/release-overview.md after release | SOP is the operator runbook for the workflow | SOP keeps the explicit `.github/workflows/release.yml` reference, names `Overview` / `Bug Fixes`, documents prerelease `dist-tag` derivation, and records one-shot override handling |

## Acceptance Criteria
- The parent implementation promotes generated `Overview` and `Bug Fixes` into canonical release-note sections and prevents duplicated promoted content in `Full Changelog`.
- `Full Changelog` still includes non-promoted generated sections and the compare line when present.
- `docs/README.md` and `.agent/SOPs/release.md` document truthful prerelease `dist-tag` derivation from `.github/workflows/release.yml`, including stable `latest`, prerelease label-derived tags, and fallback `next`.
- The signed annotated tag body is the one-shot overview override, and .github/release-overview.md cannot shape release notes.
- `.agent/SOPs/release.md` continues to reference `.github/workflows/release.yml`.
- Checklist mirrors explicitly name `Overview` and `Bug Fixes` and separate initial diff-budget evidence from final review-wrapper rerun evidence.

## Non-Goals
- No npm publish, release tag creation, or package version bump.
- No broad release workflow redesign outside release-note generation and truthful docs parity.
- No changes to signing enforcement, trusted publishing, OIDC fallback, or `pack:smoke` policy unless directly required by the parent implementation.
- No Linear mutation, workpad update, PR lifecycle work, or full validation suite in this child lane.
- No implementation or test edits in this docs child lane.

## Not Done If
- `Bug Fixes` content can still appear both under the canonical `## Bug Fixes` section and again under `## Full Changelog`.
- `Overview` or `Bug Fixes` protected wording is renamed without deliberate docs parity.
- release docs still imply every prerelease publishes to `alpha` even though the workflow derives `DIST_TAG`.
- .github/release-overview.md can silently remain as a stale override across releases without a documented or enforced one-shot contract.
- `docs/README.md` and `.agent/SOPs/release.md` disagree with `.github/workflows/release.yml`.
- review evidence collapses initial diff-budget evidence and final review-wrapper rerun evidence into one ambiguous checklist item.

## Stakeholders
- Product: CO operators preparing release notes and release candidates.
- Engineering: release workflow maintainers and docs reviewers.
- Operations / Review: PR reviewers validating release-note output and evidence in PR `#608` follow-up work.

## Metrics & Guardrails
- Primary Success Metrics:
  - generated release notes contain a single canonical `Overview` and `Bug Fixes` promotion path
  - release docs accurately predict npm `dist-tag` behavior for stable and prerelease tags
  - one-shot overview override cannot be mistaken for persistent release content
- Guardrails / Error Budgets:
  - preserve existing release signing, pack, publish, and prerelease workflow controls
  - keep the change bounded to release-note generation/docs parity
  - keep review evidence machine-checkable through checklist mirrors

## User Experience
- Personas:
  - release operator preparing a signed tag and GitHub Release
  - reviewer checking generated release notes and docs parity
  - downstream user reading published release notes
- User Journeys:
  - operator tags a release and sees promoted `Overview` and `Bug Fixes` once, with remaining details under `Full Changelog`
  - operator prepares an alpha, beta, rc, or fallback prerelease and knows which npm `dist-tag` the workflow will publish
  - operator uses the signed annotated tag body deliberately for one release without carrying stale summary text forward

## Technical Considerations
- Architectural Notes:
  - current `.github/workflows/release.yml` derives `DIST_TAG` during `Resolve release metadata`
  - current release-note generation reads GitHub generated notes, extracts `Overview` and `Bug Fixes`, and writes `release-notes.md`
  - current implementation strips `Overview` before composing `Full Changelog`; the parent should verify whether `Bug Fixes` also needs to be stripped after promotion
  - .github/release-overview.md is optional and currently absent in this checkout
  - docs parity spans `docs/release-notes-template-addendum.md`, `docs/README.md`, and `.agent/SOPs/release.md`
- Dependencies / Integrations:
  - `.github/workflows/release.yml`
  - `.github/release.yml`
  - .github/release-overview.md
  - `docs/release-notes-template-addendum.md`
  - `docs/README.md`
  - `.agent/SOPs/release.md`

## Open Questions
- Resolved by parent implementation: stale-safe override handling uses the signed annotated tag body and the workflow no longer reads .github/release-overview.md.
- Resolved by parent implementation: strip promoted `Overview` and `Bug Fixes` from `Full Changelog` and keep other generated content unchanged.
- Should `docs/release-notes-template-addendum.md` mention `.github/workflows/release.yml` directly, or should the parent keep that cross-reference limited to `docs/README.md` and `.agent/SOPs/release.md`?

## Approvals
- Product: self-approved from bounded `CO-314` issue wording carried into this packet.
- Engineering: pending parent docs-review / implementation handoff.
