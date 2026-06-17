---
id: 20260423-linear-b2712a15-b04f-4a4e-aac8-35f614abb01b-release-runbook-parity-docs-check-truth-coverage
title: CO-315 release-runbook parity and docs:check truth coverage
status: in_progress
relates_to: docs/PRD-linear-b2712a15-b04f-4a4e-aac8-35f614abb01b.md
risk: high
owners:
  - Codex
last_review: 2026-06-17
review_notes:
  - 2026-06-17: CO-579 pre-expiry review kept this spec active-current; no verified terminal/archive evidence was established in this stream, CO-579 is the live non-terminal docs-freshness owner, and docs/spec gates remain unchanged.
  - 2026-05-18: CO-522 active-spec audit found 12 unchecked task checklist items, so this spec remains active and was reviewed for current lifecycle ownership rather than archived. Evidence: `out/linear-b642e879-ba50-45ef-b0d9-b059afa9e932-recovery/spec-preexpiry-local-classification.json`.
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-b2712a15-b04f-4a4e-aac8-35f614abb01b.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-b2712a15-b04f-4a4e-aac8-35f614abb01b.md`
- PRD: `docs/PRD-linear-b2712a15-b04f-4a4e-aac8-35f614abb01b.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-b2712a15-b04f-4a4e-aac8-35f614abb01b.md`
- Task checklist: `tasks/tasks-linear-b2712a15-b04f-4a4e-aac8-35f614abb01b.md`

## Traceability
- Linear issue: `CO-315` / `b2712a15-b04f-4a4e-aac8-35f614abb01b`
- Shared source 0 anchor: `ctx:sha256:08ac8534528c20e15c4bf7265a363da0a47f727b08fa91807f76e42ad0030574#chunk:c000001`
- Source object id: `sha256:08ac8534528c20e15c4bf7265a363da0a47f727b08fa91807f76e42ad0030574`
- Context dir: `.runs/linear-b2712a15-b04f-4a4e-aac8-35f614abb01b-docs-packet/cli/2026-04-23T00-51-01-276Z-b894da73/memory/source-0`
- Source payload: `.runs/linear-b2712a15-b04f-4a4e-aac8-35f614abb01b-docs-packet/cli/2026-04-23T00-51-01-276Z-b894da73/memory/source-0/source.txt`
- Origin manifest: `.runs/linear-b2712a15-b04f-4a4e-aac8-35f614abb01b-docs-packet/cli/2026-04-23T00-51-01-276Z-b894da73/manifest.json`

## Summary
- Objective: make the bundled release skill truthful against the current release runbook and make protected release-surface drift fail `docs:check`.
- Scope:
  - parent-owned refresh of `skills/release/SKILL.md`
  - parent-owned release-surface truth coverage in `docs/docs-catalog.json` and `scripts/docs-hygiene.ts`
  - parent-owned focused validation proving drift in release skill/SOP/addendum is not silent
- Constraints:
  - keep the lane bounded to release-runbook parity plus machine-checkability
  - do not change release workflow behavior or publish policy
  - keep this child lane docs-only

## Issue-Shaping Contract
- User-request translation carried forward:
  - refresh `skills/release/SKILL.md` so it matches the current release SOP/workflow truthfully
  - extend release-surface truth checks so drift in the release skill/SOP/addendum fails `docs:check`
  - keep the lane bounded to release-runbook parity and machine-checkability
  - acceptance must explicitly cover validation floor, signing secret posture, manual-dispatch tag semantics, overview override behavior, and OIDC-vs-`NPM_TOKEN` publish posture
- Protected terms / exact artifact and surface names:
  - `skills/release/SKILL.md`
  - `.agent/SOPs/release.md`
  - `docs/release-notes-template-addendum.md`
  - `docs/README.md`
  - `.github/workflows/release.yml`
  - `docs/docs-catalog.json`
  - `scripts/docs-hygiene.ts`
  - `docs:check`
  - validation floor
  - `RELEASE_SIGNING_PUBLIC_KEYS`
  - `RELEASE_SIGNING_ALLOWED_SIGNERS`
  - `workflow_dispatch`
  - `inputs.tag`
  - signed annotated tag body overview override
  - .github/release-overview.md is not read by the workflow
  - OIDC trusted publishing
  - `secrets.NPM_TOKEN`
  - `--provenance`
- Nearby wrong interpretations to reject:
  - broad release automation redesign
  - changing workflow behavior instead of documenting/enforcing current truth
  - deprecating `NPM_TOKEN` fallback in this lane
  - broad docs-catalog or docs-freshness cleanup
  - generic release-doc refresh with no machine-checkable drift failure
- Explicit non-goals carried forward:
  - no release workflow semantic changes
  - no dist-tag changes
  - no auth-policy changes beyond truthful documentation
  - no unrelated docs-system redesign

## Parity / Alignment Matrix
- Current truth:
  - `.agent/SOPs/release.md` holds the actual release validation floor and current tag/signing/manual-dispatch guidance.
  - `.github/workflows/release.yml` enforces existing-tag semantics for manual dispatch, exact signing-secret verification posture, overview override handling, and OIDC-first publish with `NPM_TOKEN` fallback.
  - `docs/README.md` already documents overview override behavior and OIDC publish posture.
  - `docs/release-notes-template-addendum.md` documents shipped-skills notes, but it is not covered by a release-specific `docs:check` truth rule.
  - `skills/release/SKILL.md` does not fully mirror the current release runbook truth and can still drift without a normal docs-validation failure.
- Reference truth:
  - the authoritative current release behavior is already encoded in `.agent/SOPs/release.md`, `docs/README.md`, `docs/release-notes-template-addendum.md`, and `.github/workflows/release.yml`
  - release guidance should be self-contained enough that maintainers do not need hidden workflow knowledge for the standard release path
  - normal docs validation should fail when protected release docs drift from that truth
- Target truth / intended delta:
  - `skills/release/SKILL.md` mirrors the current release runbook accurately
  - release-surface docs coverage in `docs/docs-catalog.json` and `scripts/docs-hygiene.ts` makes `docs:check` fail on protected drift in the release skill/SOP/addendum
  - the protected acceptance seams are explicit and machine-checkable: validation floor, signing secret posture, manual-dispatch tag semantics, overview override behavior, and OIDC-vs-`NPM_TOKEN` publish posture
- Explicitly out-of-scope differences:
  - changing `.github/workflows/release.yml`
  - changing npm dist-tag behavior
  - changing publish auth policy beyond documenting/enforcing current truth
  - broad docs-catalog redesign outside release surfaces

## Readiness Gate
- Not done if:
  - maintainers still need hidden repo knowledge to run a truthful release
  - release drift can still accumulate across the release skill/SOP/addendum without a normal `docs:check` failure
  - the validation floor, signing posture, manual-dispatch semantics, overview override, or publish-auth posture remain omitted or contradictory
  - the lane broadens into workflow redesign instead of parity plus machine-checkability
- Pre-implementation issue-quality review evidence:
  - 2026-04-23: this child-lane packet confirms `CO-315` is a parity/alignment lane, not a workflow-redesign lane. The micro-task path is ineligible because correctness depends on exact protected artifact names, exact release semantics, and machine-checkable drift coverage rather than a tiny isolated change.
- Safeguard ownership split:
  - child lane owns only the listed docs/task files and `tasks/index.json`
  - parent lane owns implementation, focused validation, docs-review, Linear/workpad state, PR lifecycle, and merge

## Technical Requirements
- Functional requirements:
  - refresh `skills/release/SKILL.md` so it truthfully reflects the current release runbook
  - the release skill must document the current validation floor explicitly:
    - `node scripts/delegation-guard.mjs`
    - `node scripts/spec-guard.mjs --dry-run`
    - `npm run build`
    - `npm run lint`
    - `npm run test`
    - `npm run docs:check`
    - `npm run docs:freshness`
    - `npm run repo:stewardship`
    - `node scripts/diff-budget.mjs`
    - `NOTES=\"Goal: ... | Summary: ... | Risks: ... | Questions (optional): ...\" npm run review`
    - `npm run pack:audit`
    - `npm run pack:smoke`
  - package artifact validation must remain explicit and separate from the validation floor:
    - `npm run clean:dist && npm run build`
  - release surfaces must document signing posture accurately:
    - release commits/tags remain cryptographically signed on the release machine
    - CI tag verification requires exactly one of `RELEASE_SIGNING_PUBLIC_KEYS` or `RELEASE_SIGNING_ALLOWED_SIGNERS`
    - missing or dual secret configuration is a release blocker
  - release surfaces must document manual-dispatch tag semantics accurately:
    - `workflow_dispatch` publishes only an existing release tag
    - `inputs.tag` is required when not already on a tag ref
    - no branch-based manual publish path is implied
  - release surfaces must document overview override behavior accurately:
    - the signed annotated tag body is the optional one-shot override
    - the workflow does not read .github/release-overview.md
    - `docs/release-notes-template-addendum.md` retains shipped-skills note placement plus install/refresh guidance
  - release surfaces must document publish auth posture accurately:
    - OIDC trusted publishing is attempted first
    - the OIDC publish path uses `--provenance`
    - `secrets.NPM_TOKEN` is the fallback when OIDC is unavailable or fails
    - the fallback token must be an npm automation token rather than an OTP-gated token
  - `docs:check` must fail when the release skill, release SOP, or release-notes addendum drift on those protected release truths
- Non-functional requirements:
  - the parity check must be machine-checkable in a normal `npm run docs:check`
  - no hidden maintainer knowledge should be required for the standard release path
  - release documentation changes must not alter actual release workflow behavior
  - the truth check should remain bounded to release surfaces rather than creating a generic document-diff framework
- Interfaces / contracts:
  - `skills/release/SKILL.md`
  - `.agent/SOPs/release.md`
  - `docs/release-notes-template-addendum.md`
  - `docs/README.md`
  - `.github/workflows/release.yml`
  - `docs/docs-catalog.json`
  - `scripts/docs-hygiene.ts`
  - parent-selected focused docs-hygiene test surface

## Architecture & Data
- Architecture / design adjustments:
  - add release-surface catalog entries for the bundled release skill, release SOP, and release-notes addendum so docs-hygiene can apply targeted truth checks to them
  - add a bounded release truth-check in `scripts/docs-hygiene.ts` that compares protected release facts instead of relying on broad reviewer interpretation
  - use the current workflow/README/SOP/addendum as the release truth source rather than inventing a new external truth file
- Data model changes / migrations:
  - none expected for this lane
- External dependencies / integrations:
  - repository-local `.github/workflows/release.yml`
  - repository-local docs/catalog tooling only
  - no network dependency required

## Acceptance Criteria
1. `skills/release/SKILL.md` is refreshed so it no longer omits or contradicts the current release validation floor.
2. The release skill and protected release docs state the signing posture accurately, including exactly-one-of `RELEASE_SIGNING_PUBLIC_KEYS` / `RELEASE_SIGNING_ALLOWED_SIGNERS`.
3. The release skill and protected release docs state manual-dispatch tag semantics accurately and do not imply branch-based publish.
4. The release skill and addendum state overview override behavior accurately, including signed annotated tag body usage, explicit .github/release-overview.md non-use, and shipped-skills notes/install guidance.
5. The release skill and protected release docs state OIDC-vs-`NPM_TOKEN` publish posture accurately, including `--provenance` and automation-token fallback.
6. A normal `npm run docs:check` fails when the release skill, release SOP, or addendum drift on those protected release truths.
7. Maintainers no longer need hidden repo knowledge from workflow YAML or scattered release notes to follow the standard release path.
8. The implementation remains bounded to release-runbook parity and docs validation coverage; it does not redesign release behavior.

## Validation Plan
- Tests / checks:
  - child lane: `jq empty tasks/index.json`
  - child lane: docs-only `git diff --check`
  - parent lane: focused docs-hygiene coverage for release parity drift
  - parent lane: `npm run docs:check`
  - parent lane: `npm run docs:freshness`
  - parent lane: `npm run repo:stewardship`
  - parent lane: `node scripts/spec-guard.mjs --dry-run`
  - parent lane: docs-review and required review/elegance gates before PR handoff
- Rollout verification:
  - parent records evidence that intentional drift in the release skill/SOP/addendum causes `docs:check` failure
  - parent records the refreshed release-skill surface as the maintainer-visible runbook proof
- Monitoring / alerts:
  - no new monitoring; normal CI/docs validation is the enforcement path

## Open Questions
- Should the release truth check be one composite rule or several smaller release-specific rules under the same docs-hygiene surface?
- Should `docs/README.md` remain a source-of-truth input only, or should it also gain explicit release-surface truth checks in this pass?
- What is the smallest robust way to assert addendum parity without making the check brittle to harmless wording changes?

## Approvals
- Reviewer: pending parent docs-review and implementation validation
- Date: 2026-04-23
