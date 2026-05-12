# Task Checklist - linear-b642e879-ba50-45ef-b0d9-b059afa9e932

- Linear Issue: `CO-522` / `b642e879-ba50-45ef-b0d9-b059afa9e932`
- Canonical owner key: `docs:freshness:maintain`
- Protected owner-key token: `canonical_owner_key=docs:freshness:maintain`
- Required live-owner target: `new live owner CO-522`

## Scope
- [x] Create this single CO-522 task checklist file for the docs freshness owner rehome packet slice.
- [x] Preserve the terminal-owner blocker facts exactly: `owner_issue=CO-511`, `configured_owner_terminal`, `issue_state=Done`, `blocking_changed_paths=[]`, and `freshness_decision=block_diff_local`.
- [x] Preserve the canonical owner route exactly: `canonical_owner_key=docs:freshness:maintain`.
- [x] Preserve the target owner outcome exactly: `new live owner CO-522`.

## Acceptance Criteria
- [x] Parent re-homes the live `docs:freshness:maintain` owner from terminal `owner_issue=CO-511` to `new live owner CO-522`.
- [x] Parent keeps `configured_owner_terminal`, `issue_state=Done`, `blocking_changed_paths=[]`, and `freshness_decision=block_diff_local` visible as machine-readable blocker evidence.
- [x] Parent verifies the replacement owner path by exact `canonical_owner_key=docs:freshness:maintain`.
- [x] Parent leaves product implementation lanes and unrelated provider-worker behavior out of the owner rehome.

## Validation
- [x] Child scoped file creation only. Evidence: this file is the only declared child-lane edit.
- [x] Parent reruns `npm run docs:freshness:maintain -- --format json` after importing the packet slice.
- [x] Parent records the before/after owner-truth output proving terminal `owner_issue=CO-511` no longer remains the live configured owner.
- [x] Parent runs broader docs freshness and spec validation in the authoritative issue workspace; both preserve existing stale-baseline blockers without weakening gates.
- [x] Parent records standalone review and elegance evidence before any review handoff.
- [ ] Parent records PR and Linear lifecycle validation before any review handoff.

## Non-Goals
- Do not edit parent-owned owner metadata, registry mirrors, `tasks/index.json`, `docs/TASKS.md`, workpad comments, PR state, or Linear state from this child lane.
- Do not weaken `docs:freshness`, `docs:freshness:maintain`, spec guard, or owner verification semantics.
- Do not hide or delete terminal-owner evidence to make the gate pass.
- Keep CO-514 provider-worker manifest serialization out of scope.

## Evidence
- Source anchor: `ctx:sha256:1abafed42f940096a3f36ad165f83269a6d61f805f22db09605ed97dac2ae384#chunk:c000001`.
- Source manifest: `.runs/linear-b642e879-ba50-45ef-b0d9-b059afa9e932-co522-task-checklist/cli/2026-05-12T17-20-16-231Z-292db3b2/manifest.json`.
- Child lane scope: `tasks/tasks-linear-b642e879-ba50-45ef-b0d9-b059afa9e932.md` only.
- Local note: the referenced source payload path was not present in this child checkout, so this checklist anchors to the child prompt facts and the source manifest pointer.
