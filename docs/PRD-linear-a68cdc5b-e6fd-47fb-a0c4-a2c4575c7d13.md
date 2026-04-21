# PRD - CO: clarify README when main documents behavior newer than the latest tagged package

## Traceability
- Linear issue: `CO-273` / `a68cdc5b-e6fd-47fb-a0c4-a2c4575c7d13`
- Linear URL: https://linear.app/asabeko/issue/CO-273/co-clarify-readme-when-main-documents-behavior-newer-than-the-latest
- Task id: `linear-a68cdc5b-e6fd-47fb-a0c4-a2c4575c7d13`
- Canonical spec: `tasks/specs/linear-a68cdc5b-e6fd-47fb-a0c4-a2c4575c7d13.md`
- Parent manifest: `.runs/linear-a68cdc5b-e6fd-47fb-a0c4-a2c4575c7d13/cli/2026-04-21T02-11-19-447Z-184f2469/manifest.json`
- Source anchor: `ctx:sha256:7f6dd672017997283582c2d667c65a1b0ed8cab23d07c2795d2e02801d90fa46#chunk:c000001`

## Summary
- Problem Statement: the repo front door currently presents the `main` branch README as if it were release-safe, even though the latest tagged and published package is still `0.1.38` / `v0.1.38` and `main` is more than 1200 commits ahead of that tag. Post-tag README content now references surfaces that did not exist in the `v0.1.38` package, including packaged marketplace/plugin installation details and the new `docs/public/downstream-setup.md` and `docs/public/provider-onboarding.md` guides.
- Desired Outcome: README tells readers when they are looking at source-head behavior, routes published-package users to release-safe docs, and marks install/setup guidance that relies on unreleased source-head surfaces without forcing a release, version bump, or broader docs rewrite.

## User Request Translation (Context Anchor)
- User intent / needs: complete `CO-273` by making the README truthful about the gap between current `main` docs and the latest tagged package, while keeping the lane bounded to documentation truthfulness rather than release execution.
- Success criteria / acceptance:
  - README explicitly says the repo README tracks `main` and is ahead of the latest tagged package when that is true in the current tree.
  - Published-package users are routed to a release-safe doc path, not silently left on source-head guidance.
  - Install/setup sections that depend on post-`v0.1.38` behavior are clearly marked as source-head-only in this checkout.
  - No package version bump, release tag move, or publish workflow change is introduced.
- Constraints / non-goals:
  - stay within README and required docs-first packet / registry mirrors
  - do not change runtime behavior, packaging behavior, or release automation
  - do not treat the existence of `docs/public/*` on `main` as proof those docs are release-safe for `0.1.38`

## Intent Checksum
- Exact user wording / phrases to preserve:
  - `README`
  - `main`
  - `latest tagged package`
  - `release-safe docs`
  - `source-head only`
- Protected terms / exact artifact and surface names:
  - `README.md`
  - `package.json`
  - `v0.1.38`
  - `0.1.38`
  - `docs/public/downstream-setup.md`
  - `docs/public/provider-onboarding.md`
  - `plugins/codex-orchestrator`
  - `.agents/plugins/marketplace.json`
- Nearby wrong interpretations to reject:
  - "fix this by cutting a release now"
  - "the new `docs/public/*` guides are already release-safe for `0.1.38` because they exist on `main`"
  - "local checkout and Git-backed marketplace installs are equivalent to the published npm package without pinning a tag"
  - "rewrite the whole README or downstream onboarding surface while touching this warning"

## Parity / Alignment Matrix

| Surface | Current Truth | Reference Truth | Target Truth | Explicitly Out Of Scope |
| --- | --- | --- | --- | --- |
| Root README | `README.md` on `main` is the front door and does not clearly separate source-head docs from latest released package docs. | `v0.1.38` is the latest local tag and `package.json` still reports `0.1.38`. | Root README explicitly says when it is documenting `main`, not the latest tagged package. | Rewriting unrelated README sections. |
| Marketplace/plugin install guidance | Current README describes packaged and source-driven marketplace/plugin flows that were added after `v0.1.38`. | `v0.1.38` package contents did not include `.agents/plugins/marketplace.json`, `plugins/**`, or the repo-root `bin/codex-orchestrator.js` path. | Marketplace/setup guidance is labeled so released users know which path is release-aligned and which path is source-head-only. | Changing marketplace implementation or packaging. |
| Public downstream docs links | `docs/public/downstream-setup.md` and `docs/public/provider-onboarding.md` are new on `main`. | `v0.1.38` had no `docs/public/*` shipped docs. | README does not imply those new `docs/public/*` paths are release-safe for `0.1.38`. | Publishing or backporting new docs into the old release. |

## Not Done If
- README still implies the current `main` front door is release-safe for the latest published package.
- Released-package users have no explicit route to a `v0.1.38`-aligned doc path.
- Source-head-only install/setup guidance is still presented without a boundary.
- The fix changes version numbers, tags, publish workflows, or runtime behavior.

## Goals
- State the current `main` versus latest release truth explicitly in `README.md`.
- Route release-aligned readers to the tagged `v0.1.38` README.
- Mark post-`v0.1.38` install/setup guidance as source-head-only where needed.
- Keep the diff limited to docs truthfulness plus required task-packet registration.

## Non-Goals
- No release, publish, or version bump work.
- No update to package contents or plugin behavior.
- No broad public-doc restructuring beyond the narrow truthfulness note.
- No new automation to detect release drift in this lane.

## Stakeholders
- Product: CO maintainers and downstream operators who install the published npm package.
- Engineering: docs hygiene, package truthfulness, and provider-worker handoff maintainers.
- Design: N/A.

## Metrics & Guardrails
- Primary Success Metrics:
  - README includes an explicit `main` versus latest release distinction.
  - README gives a release-safe `v0.1.38` route for published-package users.
  - README labels source-head-only setup guidance where the content is newer than `v0.1.38`.
- Guardrails / Error Budgets:
  - no change to `package.json.version`
  - no release or publish side effects
  - no claims that `docs/public/*` existed in `v0.1.38`
  - no unrelated README expansion

## Technical Considerations
- Architectural Notes:
  - this is a docs-only truthfulness lane
  - current truth must be anchored on local repo evidence: `package.json`, `git describe --tags --abbrev=0`, `git rev-list --count v0.1.38..HEAD`, and the diff from `v0.1.38` to current README/public docs
  - docs-first packet and registry mirrors are required because the lane changes tracked docs
- Dependencies / Integrations:
  - `README.md`
  - `package.json`
  - git tag `v0.1.38`
  - Linear workpad/state helpers

## Open Questions
- None. If a wider release-safe docs split is needed later, file a follow-up instead of widening `CO-273`.

## Approvals
- Product: Codex provider worker, 2026-04-21
- Engineering: final standalone review `bounded-success` recorded in `/Users/kbediako/Code/CO/.runs/linear-a68cdc5b-e6fd-47fb-a0c4-a2c4575c7d13/cli/2026-04-21T07-35-34-622Z-391b3ca3/review/telemetry.json`; stale handoff-status and unrelated registry-row P2s addressed, with no actionable diff-local issues remaining before PR handoff
- Design: N/A
