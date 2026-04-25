# PRD - CO: repair archive automation auto-merge token

## Added by Bootstrap 2026-04-25

## Traceability
- Linear issue: `CO-362` / `fd4bf705-11a9-4717-948c-addfb4fa3f83`
- Linear URL: https://linear.app/asabeko/issue/CO-362/co-repair-archive-automation-auto-merge-token
- Source issue: `CO-356` / `56c2656d-853f-43f9-91af-455970800060`
- Related issue: `CO-356` produced the out-of-scope finding that the archive automation required-check dispatch is repo code, while the existing auto-merge credential failed independently.
- Task id: `linear-fd4bf705-11a9-4717-948c-addfb4fa3f83`
- Canonical spec: `tasks/specs/linear-fd4bf705-11a9-4717-948c-addfb4fa3f83.md`
- Source anchor: `ctx:sha256:becfd8cba79308cf736ffb09357d004b9d8b428a1389367239b753c92a9107d6#chunk:c000001`
- Source object id: `sha256:becfd8cba79308cf736ffb09357d004b9d8b428a1389367239b753c92a9107d6`
- Source payload: `.runs/linear-fd4bf705-11a9-4717-948c-addfb4fa3f83-docs-packet-cli/cli/2026-04-25T06-07-45-642Z-4500fa92/memory/source-0/source.txt`
- Origin manifest: `.runs/linear-fd4bf705-11a9-4717-948c-addfb4fa3f83-docs-packet-cli/cli/2026-04-25T06-07-45-642Z-4500fa92/manifest.json`

## Summary
- Problem Statement: GitHub Actions evidence from a `tasks-archive-automation` run showed the optional archive auto-merge step using `ARCHIVE_AUTOMERGE_TOKEN` returned `401 Unauthorized` / `Bad credentials`. The required-check dispatch belongs to the earlier `CO-356` repo-code lane, but the credential failure is an independent secret or permission problem that can still block archive PR auto-merge after `Core Lane` is green.
- Desired Outcome: parent implementation confirms the required `Core Lane` path is green for an archive PR, rotates or repairs `ARCHIVE_AUTOMERGE_TOKEN` permissions outside repo code, verifies archive auto-merge can enable or complete without `401 Bad credentials`, and records GitHub Actions evidence plus PR outcome on `CO-362`.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): create the docs-first packet for `CO-362` so the parent lane can handle only the archive auto-merge credential repair after appserver child-lane recovery. The lane must preserve the distinction between repo workflow fixes and secret or permission rotation, and it must not expose token values or change branch protection.
- Success criteria / acceptance:
  - Confirm the required `Core Lane` path is green for an archive PR before testing auto-merge.
  - Rotate or repair `ARCHIVE_AUTOMERGE_TOKEN` permissions outside repo code.
  - Verify an archive automation PR can enable or complete auto-merge without `401 Bad credentials`.
  - Record GitHub Actions evidence and PR outcome on the issue.
- Constraints / non-goals:
  - Do not weaken branch protection. Do not embed tokens in repository files. Do not change archive eligibility or archive payload contents. Do not treat `Cloud Canary` as a replacement for `Core Lane`.
  - Do not touch workflow files, scripts, tests, secrets, or branch protection behavior from this docs child lane.
  - Do not call Linear mutation helpers from this child lane.
  - Do not run full repo validation suites from this child lane.

## Intent Checksum
- Exact user wording / phrases to preserve:
  - `ARCHIVE_AUTOMERGE_TOKEN`
  - `tasks-archive-automation`
  - `implementation-docs-archive-automation`
  - archive auto-merge
  - `401 Bad credentials`
  - `401 Unauthorized`
  - `Bad credentials`
  - `Core Lane`
  - `Cloud Canary`
- Protected terms / exact artifact and surface names:
  - `ARCHIVE_AUTOMERGE_TOKEN`
  - `tasks-archive-automation`
  - `implementation-docs-archive-automation`
  - archive auto-merge
  - `401 Bad credentials`
  - `Core Lane`
  - `Cloud Canary`
  - GitHub Actions
  - archive PR
- Nearby wrong interpretations to reject:
  - "fix this by changing checked-in workflow logic in `tasks-archive-automation` or `implementation-docs-archive-automation`"
  - "bypass or weaken `Core Lane` to let archive PRs merge"
  - "treat `Cloud Canary` as sufficient required-check evidence"
  - "commit token values, secret names beyond `ARCHIVE_AUTOMERGE_TOKEN`, or credential material into repo files"
  - "change archive eligibility, archive payload contents, or branch protection behavior"
  - "hide the secret failure or log secret values"

## Parity / Alignment Matrix

| Surface | Current truth | Reference truth | Target truth |
| --- | --- | --- | --- |
| Required checks | `CO-356` owns the repo-code path for archive automation required-check dispatch. | Archive PR auto-merge should only be tested after required `Core Lane` evidence is green. | Parent confirms green `Core Lane` for an archive PR before testing archive auto-merge. |
| Auto-merge credential | `ARCHIVE_AUTOMERGE_TOKEN` produced `401 Unauthorized` / `Bad credentials` in GitHub Actions. | Credential repair is an external secret or permission rotation, not a checked-in workflow fix. | `ARCHIVE_AUTOMERGE_TOKEN` can enable or complete archive auto-merge without `401 Bad credentials`. |
| Archive automation surfaces | `tasks-archive-automation` and `implementation-docs-archive-automation` are the protected automation surfaces. | The automations should keep their existing archive eligibility and payload behavior. | Parent validates archive auto-merge behavior without changing archive eligibility or payload contents. |
| Branch protection | Required checks and branch protection must remain authoritative. | `Core Lane` remains the required gate; `Cloud Canary` is not a replacement. | No branch protection weakening or bypass lands. |
| Secret handling | The issue identifies the token name, not the token value. | Secrets are rotated or permissioned outside repo code. | No secret value appears in repository docs, logs, workflow files, or issue evidence. |

## Not Done If
- Archive PRs still cannot auto-merge after `Core Lane` is green because `ARCHIVE_AUTOMERGE_TOKEN` remains invalid or under-scoped.
- The lane hides secret failures, logs secret values, or bypasses required checks.
- The final evidence only proves `Cloud Canary` and does not confirm the required `Core Lane` path.
- The repair depends on checked-in workflow changes, branch-protection weakening, archive eligibility changes, or archive payload changes.
- The issue lacks GitHub Actions evidence and PR outcome after parent validation.

## Goals
- Preserve `ARCHIVE_AUTOMERGE_TOKEN`, `tasks-archive-automation`, `implementation-docs-archive-automation`, archive auto-merge, and `401 Bad credentials` as exact protected surfaces.
- Keep the fix boundary outside repo code: credential or permission rotation only.
- Require a green `Core Lane` archive PR path before testing archive auto-merge.
- Verify that archive auto-merge can enable or complete without `401 Bad credentials`.
- Record GitHub Actions evidence and PR outcome on `CO-362`.

## Non-Goals
- Do not weaken branch protection.
- Do not embed tokens in repository files.
- Do not change archive eligibility or archive payload contents.
- Do not treat `Cloud Canary` as a replacement for `Core Lane`.
- Do not edit workflow files, scripts, tests, secrets, or branch protection behavior from this docs child lane.
- Do not use this lane to reopen the `CO-356` required-check dispatch code path.

## Stakeholders
- Product: CO maintainers who rely on archive automation PRs merging only after required checks are satisfied.
- Engineering: repository maintainers and GitHub secret/permission owners.
- Design: N/A.

## Metrics & Guardrails
- Primary Success Metrics:
  - an archive PR has green required `Core Lane` evidence before auto-merge testing
  - archive auto-merge can enable or complete without `401 Bad credentials`
  - GitHub Actions evidence and archive PR outcome are recorded on `CO-362`
- Guardrails / Error Budgets:
  - no branch-protection bypass or required-check weakening
  - no secret values in repository files, logs, comments, or issue evidence
  - no checked-in workflow, script, test, archive eligibility, or archive payload change
  - no substitution of `Cloud Canary` for `Core Lane`

## User Experience
- Maintainers can see a clear split between `CO-356` repo-code automation behavior and `CO-362` secret or permission repair.
- Archive automation PRs can rely on archive auto-merge once the required check path is green.
- Future token failures can be classified by the protected `ARCHIVE_AUTOMERGE_TOKEN` plus `401 Bad credentials` evidence without searching through unrelated workflow changes.

## Technical Considerations
- Architectural Notes:
  - this docs child lane creates packet and mirrors only
  - parent implementation should operate through GitHub repository settings, organization secrets, fine-grained token permissions, or equivalent admin surfaces outside repo code
  - evidence should redact token values and record only GitHub Actions run identity, archive PR identity, check status, and auto-merge result
  - `tasks-archive-automation` and `implementation-docs-archive-automation` remain protected surface names, not implementation targets for this lane
- Dependencies / Integrations:
  - GitHub Actions
  - GitHub archive automation PRs
  - `ARCHIVE_AUTOMERGE_TOKEN`
  - required `Core Lane`
  - `tasks-archive-automation`
  - `implementation-docs-archive-automation`

## Open Questions
- Which post-rotation archive automation PR will parent use as the clean verification target after `Core Lane` is green?
- Does the repaired token only need repository `contents` and pull-request permissions, or does the current archive auto-merge path require a broader fine-grained scope? Parent must answer from GitHub evidence without exposing secret values.

## Approvals
- Product: Linear issue `CO-362`
- Engineering: pending parent-owned GitHub credential repair and archive PR validation
- Design: N/A
