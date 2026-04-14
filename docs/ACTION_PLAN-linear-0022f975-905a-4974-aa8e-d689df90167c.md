# ACTION_PLAN - CO: reconcile Done issue mirrors and validation-only closeout provenance

## Summary
- Goal: reconcile terminal Done issue mirrors and add a read-only prevention checker for stale local closeout rows.
- Scope: docs-first packet, sampled evidence inventory, local provenance manifest, mirror reconciliation for sampled Done issues, no-PR validation-only closeout pointer backfill, checker implementation, focused tests, documentation, and normal provider-worker PR/review handoff.
- Assumptions:
  - Linear Done plus merged green PR evidence is enough to classify stale local pending rows as mirror debt unless a fresh functional repro appears.
  - Validation-only Done issues can close without PRs when local closeout evidence exists.
  - The checker remains read-only and does not call live Linear or GitHub APIs.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: preserve `Linear Done`, `docs/TASKS.md`, `task mirrors`, `.agent/task mirrors`, `tasks/index.json`, `Linear workpad`, `PR attachment`, `merged PR evidence`, `no-PR validation-only closeout`, `out/<linear-id>/manual/workpad.md`, and `stale mirror waiver`.
- Not done if: Done issues can still show unwaived pending terminal rows, sampled issues are not covered, no-PR validation-only evidence remains Linear-only, stale mirrors are treated as functional failure without evidence, or the checker cannot run read-only.
- Pre-implementation issue-quality review: approved from CO-178 handoff. The issue is broader than manual checkbox cleanup and narrower than reopening completed implementation work; this packet preserves that boundary.

## Milestones & Sequencing
1. Register the CO-178 docs-first packet and task mirrors.
2. Run an audited docs-review child stream before implementation.
3. Enumerate sampled Done issue mirror/provenance evidence for `CO-92`, `CO-94`, `CO-78`, `CO-89`, `CO-43`, `CO-62`, and validation-only samples including `CO-170`.
4. Add a local provenance manifest plus read-only checker and focused tests.
5. Reconcile sampled local mirrors or add explicit stale-mirror waivers while preserving closeout evidence.
6. Document future terminal mirror closeout expectations and run required validation/review gates before PR handoff.

Current implementation evidence:
- Sample manifest: `docs/done-closeout-provenance.json`.
- Policy guide: `docs/guides/done-closeout-provenance.md`.
- CO-170 local pointer: `docs/closeout-provenance/linear-ae5b2b98-f03e-44fd-9c13-a4d58457d8cb.md`.
- Checker report: `out/linear-0022f975-905a-4974-aa8e-d689df90167c/done-closeout-provenance-report.json` with `issues=7`, `pending_rows=216`, `waived_pending_rows=216`, and `failures=0`.
- Review follow-up evidence: manifest-backed standalone review fixed P2 issues for Windows path rejection, report status truthfulness, completed PR-attachment prose, and normalized validation-only classification; final forced review completed with `status=succeeded`, `review_outcome=clean-success`, and `termination_boundary=null`.

## Dependencies
- Linear issue context and state evidence for sampled Done issues.
- GitHub merged PR evidence for implementation Done samples.
- Local task/docs/.agent mirror files and `out/` closeout artifacts.
- Existing docs-review, implementation-gate, standalone review, and provider-worker workpad workflows.

## Validation
- Checks / tests:
  - Read-only checker command over the sampled provenance manifest.
  - Focused tests for terminal pending-row detection, explicit stale-mirror waivers, no-PR validation-only local pointer requirement, and report-only mode.
  - Required repo gates after implementation: delegation guard, spec guard, build, lint, test, docs:check, docs:freshness, repo:stewardship, diff budget, manifest-backed standalone review, elegance pass, and pack:smoke if CLI/package/review-wrapper surfaces are touched.
- Rollback plan:
  - Revert the CO-178 manifest/checker/docs changes together. Do not alter sampled issue functional code or delete historical evidence.

## Risks & Mitigations
- False functional reopen: require Linear/GitHub/local evidence classification before marking a stale mirror as an implementation gap.
- Evidence loss: append reconciliation sections or waiver metadata; do not delete useful historical rows.
- Checker overreach: keep the default input manifest explicit and read-only; do not make live API calls.
- No-PR ambiguity: require local closeout pointers for validation-only Done issues and record weak/no-evidence cases as explicit follow-up or waiver decisions.

## Approvals
- Reviewer: docs-review r4 completed clean before implementation; manifest-backed implementation review completed clean after actionable P2 fixes; explicit elegance/minimality pass completed with no simplification edits.
- Date: 2026-04-14
