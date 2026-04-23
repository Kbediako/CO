# PRD - CO-338 release publish workflow fix

## Traceability
- Linear issue: `CO-338` / `0549b4a2-56b1-4164-b65a-73fd2ba7d9e8`
- Linear URL: https://linear.app/asabeko/issue/CO-338
- Task id: `linear-0549b4a2-56b1-4164-b65a-73fd2ba7d9e8`
- Release workflow surface: `.github/workflows/release.yml` publish job
- GitHub Actions failure: run `24850552467` / job `72749842900`
- Source anchor: `ctx:sha256:f3219348160765aa3ff9c69d862bb95a512a169bc4c1a4e5a794a8754b5f7c19#chunk:c000001`
- Origin manifest: `.runs/linear-0549b4a2-56b1-4164-b65a-73fd2ba7d9e8-docs-packet/cli/2026-04-23T18-52-23-912Z-060c3757/manifest.json`
- Source payload note: the provided `.runs/.../source-0/source.txt` path was not present in this child checkout; this packet is anchored on the parent handoff plus read-only inspection of the current release workflow.

## Summary
- Problem Statement: the release publish workflow failed before npm publication when the publish job ran `npm install --global npm@^11.5.1` and npm could not load `promise-retry`. The failure prevented trusted publishing from reaching the actual `npm publish` step.
- Desired Outcome: repair the release publish workflow so the trusted-publishing-capable npm path is reliable, the publish job reaches `npm publish`, and the half-shipped `v0.2.0` recovery is explicit before unblocking dependent release work.

## User Request Translation
- User intent / needs: create the docs-first contract for fixing the `CO-338` release publish failure while the parent lane investigates and implements the workflow root cause.
- Success criteria / acceptance:
  - the packet preserves the exact failing run/job identifiers and root cause
  - the implementation keeps trusted publishing reachable and does not paper over the failure with a non-publishing success
  - the publish job reaches the real `npm publish` step for the release tarball
  - the `v0.2.0` half-shipped state has a recorded recovery decision
  - `CO-316` remains blocked until npm publication is actually complete
- Constraints / non-goals:
  - this child lane only edits the declared docs/task registration files
  - no workflow implementation, package, script, Linear, workpad, or PR lifecycle edits in this child lane
  - no full repo validation suites from this child lane

## Intent Checksum
- Exact user wording / phrases to preserve:
  - `CO-338`
  - `release publish workflow failure`
  - `GitHub Actions run 24850552467 / job 72749842900`
  - `promise-retry`
  - `npm install --global npm@^11.5.1`
  - `trusted publishing`
  - `actual npm publish step`
  - `half-shipped v0.2.0 state`
  - `CO-316 remains blocked until npm publication is complete`
- Protected terms / exact artifact and surface names:
  - `.github/workflows/release.yml`
  - `publish`
  - `Ensure npm trusted publishing prerequisites`
  - `Publish to npm`
  - `npm publish`
  - `--provenance`
  - `NPM_TOKEN`
  - `v0.2.0`
  - `CO-316`
- Nearby wrong interpretations to reject:
  - "the release is fixed if the workflow skips npm publication"
  - "trusted publishing can be removed to make the job green"
  - "the token fallback alone satisfies the issue"
  - "CO-316 can proceed while npm still lacks the release"
  - "the child lane should edit `.github/workflows/release.yml`"

## Parity / Alignment Matrix

| Surface | Current Truth | Reference Truth | Target Truth | Explicitly Out Of Scope |
| --- | --- | --- | --- | --- |
| Release publish workflow | Initial failure: the `publish` job installed npm with `npm install --global npm@^11.5.1` and failed on missing `promise-retry`. Current `origin/main` replaced that with `npx --yes npm@11.5.1`, but the rerun now stops earlier because `gh release create` cannot recreate existing `v0.2.0`. | Release docs require tag-driven publishing from an immutable tarball with trusted publishing preferred and token fallback only as a fallback. | Existing releases are repaired in place, the job avoids npm self-upgrade/npx bootstrap fragility by pinning Node.js 24.5.0 with npm 11.5.1, and the workflow reaches the actual `npm publish` step. | Replacing the release workflow with a new release system or dropping provenance. |
| Failed run | Run `24850552467` / job `72749842900` failed before publication because `promise-retry` was missing during the global npm upgrade. | A publish failure before `npm publish` is not an npm-publication attempt. | Parent implementation proves the same failure mode is removed and records evidence that publication is attempted. | Treating pre-publish setup success as final release success. |
| `v0.2.0` recovery | `v0.2.0` is half-shipped: release-side artifacts exist or were initiated, but npm publication is incomplete. | The npm package version must be published from the intended immutable release artifact before downstream release tasks proceed. | Preferred recovery is to publish the existing `v0.2.0` tarball after the workflow fix; only switch to a superseding version if npm or artifact immutability makes `v0.2.0` unrecoverable and the parent records that decision. | Retagging silently, rebuilding a different `v0.2.0` artifact without evidence, or marking the release complete before npm confirms it. |
| CO-316 dependency | CO-316 depends on npm publication being complete. | Dependent release/adoption work must remain blocked while the package is not published. | CO-316 stays blocked until `npm view` or equivalent evidence confirms the package version is on npm. | Moving CO-316 forward through Linear from this child lane. |

## Not Done If
- The docs omit run `24850552467` / job `72749842900`.
- The root cause is not stated as missing `promise-retry` during `npm install --global npm@^11.5.1`.
- The fix path can pass without reaching `npm publish`.
- Trusted publishing or `--provenance` is removed without an explicit parent-owned release policy decision.
- The `v0.2.0` recovery decision is missing or ambiguous.
- `CO-316` is described as unblocked before npm publication is complete.

## Goals
- Define the release publish workflow repair contract for CO-338.
- Preserve trusted publishing as the preferred publish path.
- Require evidence that the actual npm publish step is reached.
- Document the `v0.2.0` recovery decision and CO-316 block.

## Non-Goals
- No workflow implementation edits in this child lane.
- No package metadata, dependency, or script edits in this child lane.
- No Linear mutation, workpad mutation, PR update, or release execution in this child lane.
- No broad release-system redesign.

## Stakeholders
- Product: CO release owners waiting on `v0.2.0` npm publication and dependent `CO-316`.
- Engineering: release workflow, npm package publishing, trusted publishing, and release recovery owners.
- Design: N/A.

## Metrics & Guardrails
- Primary Success Metrics:
  - parent implementation reaches the `Publish to npm` step
  - npm publication of the intended version is confirmed
  - `CO-316` remains blocked until that confirmation exists
  - child patch touches only the five declared files
- Guardrails / Error Budgets:
  - zero source/workflow/package edits in this child lane
  - zero Linear mutations
  - no trusted publishing removal in the issue contract

## Technical Considerations
- Architectural Notes:
  - The current workflow already separates `build-release` and `publish`, and publishes from a downloaded release tarball.
  - The parent fix should be narrow to the npm prerequisite path or publish-job setup so the existing immutable-tarball and OIDC publish contract remains intact.
  - The recovery plan should distinguish "GitHub release created" from "npm package published".
- Dependencies / Integrations:
  - GitHub Actions release workflow
  - npm CLI version with trusted publishing support
  - npm trusted publishing / OIDC
  - npm registry verification for `v0.2.0`
  - parent-owned release and Linear workflows

## Open Questions
- Did npm registry receive any partial `v0.2.0` publication attempt, or did the failure stop before registry mutation? Parent evidence says npm still reports `0.1.38`, so no completed `v0.2.0` publish exists.
- Will the parent recover by rerunning the fixed publish job against the existing `v0.2.0` tarball, or by recording why a superseding release is required? Current decision is repair in place because the GitHub release asset exists and npm has not published `0.2.0`.

## Approvals
- Product: parent CO-338 lane, pending
- Engineering: parent docs-review / implementation review, pending
- Design: N/A
