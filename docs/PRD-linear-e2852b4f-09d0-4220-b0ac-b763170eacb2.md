# PRD - CO: align release notes, prerelease policy, and overview override behavior with the actual release workflow

## Added by Bootstrap 2026-04-23

## Traceability
- Linear issue: `CO-314` / `e2852b4f-09d0-4220-b0ac-b763170eacb2`
- Task id: `linear-e2852b4f-09d0-4220-b0ac-b763170eacb2`
- Canonical spec: `tasks/specs/linear-e2852b4f-09d0-4220-b0ac-b763170eacb2.md`
- Shared source 0 anchor: `ctx:sha256:9ce081faa08cf4917310f2afcf0b344e2695557ee12e6f9457985060cb8e8b45#chunk:c000001`
- Source object id: `sha256:9ce081faa08cf4917310f2afcf0b344e2695557ee12e6f9457985060cb8e8b45`
- Context dir: `.runs/linear-e2852b4f-09d0-4220-b0ac-b763170eacb2/cli/2026-04-22T23-30-57-470Z-c6002761/memory/source-0`
- Source payload: `.runs/linear-e2852b4f-09d0-4220-b0ac-b763170eacb2/cli/2026-04-22T23-30-57-470Z-c6002761/memory/source-0/source.txt`
- Origin manifest: `.runs/linear-e2852b4f-09d0-4220-b0ac-b763170eacb2/cli/2026-04-22T23-30-57-470Z-c6002761/manifest.json`

## Summary
- Problem Statement: CO’s release workflow and maintainer-facing release docs are no longer telling the same story about which release-note sections get elevated, how prerelease tags map to npm dist-tags, and how an override can replace the generated overview text.
- Desired Outcome: the workflow and release-facing docs share one truthful contract, and the release overview override becomes an explicit one-shot mechanism that cannot leak forward from a stale committed repo file.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words):
  - Align the release-note addendum with the workflow’s actual rendered top sections.
  - Update maintainer docs so prerelease tags are described in the same generic/dist-tag terms the workflow uses today.
  - Replace the former .github/release-overview.md contract with an explicit one-shot overview override mechanism.
  - Keep `docs/README.md` and `.agent/SOPs/release.md` in lock-step with `.github/workflows/release.yml`.
- Success criteria / acceptance:
  - Shipped skill notes have one canonical release-note section contract.
  - Prerelease docs match the workflow’s real dist-tag derivation.
  - A stale committed overview file can no longer silently affect a later release.
  - Docs and workflow describe the same operator behavior.
- Constraints / non-goals:
  - Keep scope narrow to release notes, prerelease policy wording, the overview override contract, and focused validation.
  - Do not broaden into signing changes, package publish redesign, or unrelated release-pipeline refactors.

## Intent Checksum
- Exact user wording / phrases to preserve:
  - `align release notes, prerelease policy, and overview override behavior with the actual release workflow`
  - `release-notes-template-addendum`
  - `prerelease policy`
  - `overview override behavior`
  - `the actual release workflow`
- Protected terms / exact artifact and surface names:
  - `docs/release-notes-template-addendum.md`
  - `.github/workflows/release.yml`
  - former .github/release-overview.md override file
  - `docs/README.md`
  - `.agent/SOPs/release.md`
  - `Overview`
  - `Bug Fixes`
  - `dist-tag`
  - signed annotated tag body
- Nearby wrong interpretations to reject:
  - teaching maintainers that `Documentation` is still a promoted top section
  - documenting only `alpha` prereleases when the workflow supports generic prerelease labels
  - keeping the former .github/release-overview.md override as a standing checked-in contract
  - rewriting the entire release workflow instead of fixing the truth surfaces
  - changing unrelated signing or publishing semantics

## Parity / Alignment Matrix

| Surface | Current truth | Reference truth | Target truth |
| --- | --- | --- | --- |
| Release-note highlights | `docs/release-notes-template-addendum.md` says shipped skill notes can live under `Overview` or `Documentation`, while the workflow only lifts `Overview` and `Bug Fixes` into the top rendered sections. | Maintainers should author release-note highlights according to the sections the workflow actually elevates. | Shipped skill notes use `Overview` as the canonical highlight section, with docs explicitly stating that only `Overview` and `Bug Fixes` are promoted above `Full Changelog`. |
| Prerelease docs | `docs/README.md` and `.agent/SOPs/release.md` still describe prereleases as `alpha`-only and `alpha`-dist-tag-specific. | Prerelease guidance must match the workflow’s generic tag parsing and dist-tag derivation. | Docs explain that prerelease tags derive the npm dist-tag from the leading prerelease label, sanitized/lowercased, with `next` as the fallback when no safe label remains. |
| Overview override | The workflow reads the former .github/release-overview.md override when present, so a stale committed file can silently replace the generated overview text. | Any override must be explicit for a single release and tied to the release action itself, not a persistent repo file. | The workflow reads an optional overview override from the signed annotated tag body, making the override explicit, auditable, and one-shot per tag. |

## Not Done If
- A maintainer can still follow the docs and land release notes that the workflow renders differently.
- A prerelease tag can still behave differently from what the docs tell operators to expect.
- A stale committed overview file can still silently shape a later release.

## Goals
- Align the release-note section contract across docs and workflow.
- Document prerelease behavior truthfully relative to the workflow’s dist-tag logic.
- Replace the persistent overview override file contract with a one-shot override mechanism.
- Add focused validation so the alignment does not regress silently.

## Non-Goals
- No release signing policy change.
- No package publish transport or GitHub Release refactor beyond the overview-source contract.
- No unrelated README or SOP cleanup outside the release workflow truth surfaces.
- No new persistent repo file override for release notes.

## Stakeholders
- Product: CO operators cutting releases and reviewing release notes.
- Engineering: maintainers of `.github/workflows/release.yml`, `docs/README.md`, and `.agent/SOPs/release.md`.
- Design: N/A

## Metrics & Guardrails
- Primary Success Metrics:
  - Release docs and workflow tell the same operator story for highlights, prereleases, and overview overrides.
  - Focused regression coverage catches future drift in the release contract.
- Guardrails / Error Budgets:
  - Preserve existing signed-tag and publish behavior outside the scoped contract changes.
  - Keep the overview override explicit and non-persistent.

## User Experience
- Maintainers can follow one documented release-note convention without second-guessing the rendered release output.
- Operators can infer the npm dist-tag from the prerelease tag format without relying on `alpha`-only folklore.
- Any custom overview is authored deliberately in the signed tag itself instead of hanging around in the repo.

## Technical Considerations
- Architectural Notes:
  - The release workflow already verifies signed annotated tags, so the annotated tag body is available as an auditable one-shot overview source.
  - The release notes generator already extracts `Overview` and `Bug Fixes`; docs should match that existing rendering contract instead of broadening the workflow surface.
- Dependencies / Integrations:
  - GitHub release-notes generation in `.github/workflows/release.yml`
  - npm dist-tag handling in the release workflow
  - maintainer docs in `docs/README.md` and `.agent/SOPs/release.md`

## Open Questions
- Resolved 2026-04-23: the scoped one-shot override mechanism will use the signed annotated tag body instead of the checked-in .github/release-overview.md file.
- Resolved 2026-04-23: the validation floor will include a focused release-contract regression test rather than docs-only spot checking.

## Approvals
- Product: Linear issue `CO-314`
- Engineering: parent provider worker pre-implementation issue-quality review pending implementation
- Design: N/A
