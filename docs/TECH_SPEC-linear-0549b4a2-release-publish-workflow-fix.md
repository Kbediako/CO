---
id: linear-0549b4a2-56b1-4164-b65a-73fd2ba7d9e8
title: CO-338 release publish workflow fix
relates_to: docs/PRD-linear-0549b4a2-release-publish-workflow-fix.md
risk: high
owners:
  - Codex
last_review: 2026-04-23
---

# TECH_SPEC - CO-338 release publish workflow fix

## Summary
- Objective: fix the release publish workflow failure from GitHub Actions run `24850552467` / job `72749842900` so trusted publishing can reach the actual `npm publish` step.
- Scope: parent-owned release workflow setup around the npm prerequisite path and publish verification; child-owned docs-first packet only.
- Constraints:
  - preserve trusted publishing and `--provenance` as the preferred path
  - do not treat token fallback, setup success, or GitHub release creation as npm publication completion
  - keep `CO-316` blocked until npm publication is complete

## Issue-Shaping Contract
- User-request translation carried forward: repair the release publish workflow after `npm install --global npm@^11.5.1` failed because npm could not find `promise-retry`, blocking the job before the actual npm publish attempt.
- Protected terms / exact artifact and surface names: `CO-338`, `run 24850552467`, `job 72749842900`, `promise-retry`, `npm install --global npm@^11.5.1`, `.github/workflows/release.yml`, `Ensure npm trusted publishing prerequisites`, `Publish to npm`, `npm publish`, `--provenance`, `v0.2.0`, `CO-316`.
- Nearby wrong interpretations to reject: skipping publish, removing OIDC/provenance, relying only on `NPM_TOKEN`, retagging `v0.2.0` silently, or unblocking `CO-316` before npm confirms the package version.
- Explicit non-goals carried forward: no workflow/package/script edits from this child lane; no Linear mutation; no broad release redesign.

## Parity / Alignment Matrix
- Current truth:
  - `.github/workflows/release.yml` publish job grants `id-token: write`.
  - Run `24850552467` / job `72749842900` failed before publication because `promise-retry` was missing during the global npm upgrade.
  - PR #627 replaced the global npm self-upgrade with `npx --yes npm@11.5.1`, but the subsequent `workflow_dispatch` retry failed before `publish` because `gh release create` cannot recreate the existing `v0.2.0` release.
  - The publish step later runs token-free `npm publish "$TARBALL_PATH" --tag "$DIST_TAG" --provenance`, then falls back to `NPM_TOKEN` if OIDC fails.
- Reference truth:
  - CO release docs prefer trusted publishing from immutable release artifacts.
  - A release is not complete until npm publication is confirmed.
  - Dependent CO work remains blocked while the package is not published.
- Target truth / intended delta:
  - The npm prerequisite path uses a deterministic trusted-publishing-capable npm invocation that does not fail on missing `promise-retry` or depend on the broken runner npm to bootstrap `npx`.
  - Existing GitHub releases for the requested tag are repaired in place by updating metadata while preserving the existing tarball asset when present, so `workflow_dispatch` can recover `v0.2.0` without publishing rebuilt bytes.
  - The release job reaches the real `npm publish` command for the intended tarball.
  - The `v0.2.0` half-shipped state is recovered by publishing the existing release artifact when possible, or by recording why a superseding release is required.
  - `CO-316` remains blocked until npm publication evidence exists.
- Explicitly out-of-scope differences:
  - release version policy changes
  - package contents or tarball allowlist changes unless parent root cause proves they are required
  - removing trusted publishing or provenance
  - Linear state changes from this child lane

## Readiness Gate
- Not done if:
  - `npm publish` is still unreachable after the workflow fix
  - the setup step can still fail with missing `promise-retry`
  - the workflow succeeds without attempting publication
  - trusted publishing or provenance is removed without a separate parent-owned policy decision
  - `v0.2.0` recovery is not documented
  - `CO-316` is unblocked before npm publication completes
- Pre-implementation issue-quality review evidence:
  - 2026-04-23: child lane confirms this is not plausibly narrower than the release publish workflow setup path because the failure occurs before the actual npm publish step.
  - 2026-04-23: micro-task path is not appropriate because correctness depends on exact run/job provenance, protected release wording, trusted publishing behavior, and dependent issue gating.
- Safeguard ownership split:
  - child lane owns only the declared PRD, TECH_SPEC, ACTION_PLAN, task checklist, and `tasks/index.json` registration
  - parent lane owns workflow implementation, validation, release execution, npm verification, Linear state, workpad, PR lifecycle, and CO-316 state

## Technical Requirements
- Functional requirements:
  - remove the missing-`promise-retry` failure mode from the npm prerequisite step
  - use an npm version/path that supports trusted publishing for the publish command
  - preserve the existing immutable release tarball publishing model
  - preserve OIDC trusted publishing as the first publish attempt
  - keep token fallback behavior explicit and secondary
  - fail clearly if neither OIDC nor token fallback can publish
  - record whether `v0.2.0` is recoverable from the existing artifact or requires a superseding release
  - keep `CO-316` blocked until npm publication is verified
- Non-functional requirements:
  - deterministic in GitHub Actions hosted runners
  - no secret exposure in logs
  - no silent retagging or artifact rebuild drift
  - small, reviewable workflow diff
- Interfaces / contracts:
  - `.github/workflows/release.yml` `publish` job
  - `Ensure npm trusted publishing prerequisites` step
  - `Publish to npm` step
  - `npm publish "$TARBALL_PATH" --tag "$DIST_TAG" --provenance`
  - npm registry verification such as `npm view @kbediako/codex-orchestrator@0.2.0 version`

## Architecture & Data
- Architecture / design adjustments:
  - Parent should keep the build artifact and publish job separation intact.
  - Parent replaces the global npm self-upgrade / `npx` bootstrap with `actions/setup-node` pinning Node.js `24.5.0` and a version guard for Node.js `22.14.0+` plus npm `11.5.1+`.
  - Parent makes release creation idempotent by editing an existing release when the requested tag already has a GitHub Release, including draft and prerelease metadata repair; the workflow reuses the existing expected tarball asset and uploads the rebuilt tarball only when that asset is missing.
  - Parent should keep the OIDC npmrc token-free publish attempt so long-lived tokens are not required for the normal path.
- Data model changes / migrations:
  - none expected.
- External dependencies / integrations:
  - GitHub Actions hosted runner image
  - `actions/setup-node`
  - npm CLI trusted publishing support
  - npm registry
  - GitHub Release tarball asset

## Validation Plan
- Tests / checks:
  - parent reruns or dispatches the release publish path after the workflow fix
  - parent verifies logs show the workflow reached `Publish to npm`
  - parent verifies `npm publish` was invoked for the intended tarball and dist-tag
  - parent verifies npm registry publication for the intended version
  - parent records the `v0.2.0` recovery decision
  - parent keeps `CO-316` blocked until npm registry verification succeeds
- Child-lane checks:
  - JSON parse for `tasks/index.json`
  - protected-term scan across the five touched files
  - scoped `git diff --check` for the five touched files
- Rollout verification:
  - npm registry contains the intended version and dist-tag after the repaired workflow completes.
- Monitoring / alerts:
  - no new alerting required; release workflow logs and npm registry verification are the evidence surfaces.

## Open Questions
- Did the failed job mutate npm registry state at all, or did it stop entirely before `npm publish`?
- Is the existing `v0.2.0` release tarball available and identical to the artifact intended for npm publication?

## Approvals
- Reviewer: pending parent docs-review and implementation validation
- Date: 2026-04-23
