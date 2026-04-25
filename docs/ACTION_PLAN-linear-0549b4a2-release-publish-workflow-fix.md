# ACTION_PLAN - CO-338 release publish workflow fix

## Summary
- Goal: create the docs-first packet for fixing the release publish workflow failure from run `24850552467` / job `72749842900`.
- Scope: child lane writes only the declared packet files and `tasks/index.json`; parent owns workflow implementation, release recovery, Linear state, and PR lifecycle.
- Assumptions:
  - the parent prompt carries the authoritative issue shape for this child lane
  - the provided source payload path is not present in this child checkout
  - current `origin/main` already contains PR #627's first recovery attempt, which replaced the global npm self-upgrade with `npx --yes npm@11.5.1`
  - the latest failed retry now dies before `publish` because `gh release create` is not idempotent for the already-existing `v0.2.0` release
  - `CO-316` must remain blocked until npm publication completes

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `CO-338`
  - `GitHub Actions run 24850552467 / job 72749842900`
  - `promise-retry`
  - `npm install --global npm@^11.5.1`
  - `trusted publishing`
  - `actual npm publish step`
  - `half-shipped v0.2.0 state`
  - `CO-316 remains blocked until npm publication is complete`
- Not done if:
  - the plan can report green without reaching `npm publish`
  - trusted publishing or `--provenance` is removed
  - `v0.2.0` recovery is not explicit
  - `CO-316` is unblocked before npm registry verification
- Pre-implementation issue-quality review:
  - 2026-04-23: approved as a release publish workflow repair lane, not a general release redesign.
  - 2026-04-23: child lane keeps the implementation and release execution parent-owned because workflow/package edits are outside declared scope.

## Milestones & Sequencing
1. Child lane creates PRD, TECH_SPEC, ACTION_PLAN, task checklist, and `tasks/index.json` registration.
2. Parent reviews the packet and confirms the run/job failure evidence.
3. Parent implements the smallest workflow fix that preserves the missing-`promise-retry` recovery and makes the existing `v0.2.0` release repairable in place.
4. Parent verifies the workflow reaches `Publish to npm` and invokes `npm publish` directly from a trusted-publishing-capable Node/npm runtime for the intended release tarball.
5. Parent executes the `v0.2.0` recovery decision:
   - preferred: publish the existing `v0.2.0` release tarball after the workflow fix
   - fallback: record why `v0.2.0` cannot be recovered and use a superseding release only with explicit evidence
6. Parent verifies npm registry publication and only then unblocks `CO-316`.
7. Parent completes normal review, PR, and release lifecycle evidence.

## Dependencies
- GitHub Actions run `24850552467` / job `72749842900`
- `.github/workflows/release.yml`
- npm CLI trusted publishing support
- npm registry
- GitHub Release `v0.2.0` tarball
- `CO-316`

## Validation
- Checks / tests:
  - child: `tasks/index.json` JSON parse
  - child: protected-term scan across declared files
  - child: scoped `git diff --check`
  - parent: rerun or dispatch fixed release publish workflow
  - parent: inspect logs for `Publish to npm` and actual `npm publish`
  - parent: verify npm registry version/dist-tag
- Rollback plan:
  - revert the workflow prerequisite change if it does not preserve trusted publishing or introduces a new pre-publish failure
  - if `v0.2.0` cannot be safely recovered, record evidence and move to a parent-approved superseding release rather than mutating the existing tag silently

## Risks & Mitigations
- Risk: the workflow is made green by skipping npm publication.
  - Mitigation: acceptance requires reaching `npm publish` and confirming npm registry publication.
- Risk: the fix removes trusted publishing or provenance.
  - Mitigation: preserve OIDC publish as the first path; token fallback remains secondary.
- Risk: `v0.2.0` is already partially visible or not recoverable.
  - Mitigation: parent records exact npm registry and artifact evidence before deciding between same-version recovery and superseding release.
- Risk: CO-316 moves before publication is complete.
  - Mitigation: keep the dependent issue explicitly blocked until npm registry verification exists.

## Approvals
- Docs-first packet: bounded same-issue child lane, 2026-04-23
- Parent docs-review / implementation approval: pending
