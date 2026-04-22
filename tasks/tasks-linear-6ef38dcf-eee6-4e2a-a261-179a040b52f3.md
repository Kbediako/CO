# Task Checklist - linear-6ef38dcf-eee6-4e2a-a261-179a040b52f3

- Linear Issue: `CO-305` / `6ef38dcf-eee6-4e2a-a261-179a040b52f3`
- MCP Task ID: `linear-6ef38dcf-eee6-4e2a-a261-179a040b52f3`
- Primary PRD: `docs/PRD-linear-6ef38dcf-eee6-4e2a-a261-179a040b52f3.md`
- TECH_SPEC: `docs/TECH_SPEC-linear-6ef38dcf-eee6-4e2a-a261-179a040b52f3.md`
- Task spec: `tasks/specs/linear-6ef38dcf-eee6-4e2a-a261-179a040b52f3.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-6ef38dcf-eee6-4e2a-a261-179a040b52f3.md`
- Shared source 0 anchor: `ctx:sha256:d84141c3995ad070cf0b28b86f770ef757bfb3ee5240072fc996b2b78fa4abff#chunk:c000001`
- Workspace-local provenance anchor: `ctx:sha256:ab4c3060e772d502014ab440b9e34d0ee916242ea9a6e6b3656566dfc21366f1#chunk:c000001`
- Provided origin manifest pointer: `.runs/linear-6ef38dcf-eee6-4e2a-a261-179a040b52f3-docs-packet/cli/2026-04-22T08-59-19-453Z-a315ce06/manifest.json`

## Docs-First
- [x] PRD drafted for the singleton overwrite seam where later cross-issue reads can make `provider-linear-issue-context-cache.json` untruthful parent issue evidence. Evidence: `docs/PRD-linear-6ef38dcf-eee6-4e2a-a261-179a040b52f3.md`.
- [x] TECH_SPEC drafted with bounded cache persistence scope, issue-specific selection contract, and focused regression framing. Evidence: `tasks/specs/linear-6ef38dcf-eee6-4e2a-a261-179a040b52f3.md`, `docs/TECH_SPEC-linear-6ef38dcf-eee6-4e2a-a261-179a040b52f3.md`.
- [x] ACTION_PLAN drafted for parent implementation, focused regression coverage, and traceability updates. Evidence: `docs/ACTION_PLAN-linear-6ef38dcf-eee6-4e2a-a261-179a040b52f3.md`.
- [x] Task checklist and `.agent` mirror drafted within child-lane scope. Evidence: `tasks/tasks-linear-6ef38dcf-eee6-4e2a-a261-179a040b52f3.md`, `.agent/task/linear-6ef38dcf-eee6-4e2a-a261-179a040b52f3.md`.
- [x] Pre-implementation issue-quality review recorded in the TECH_SPEC readiness gate. Evidence: `tasks/specs/linear-6ef38dcf-eee6-4e2a-a261-179a040b52f3.md`, `docs/TECH_SPEC-linear-6ef38dcf-eee6-4e2a-a261-179a040b52f3.md`.

## Source / Assumptions
- [x] Shared source-0 metadata anchor recorded. Evidence: `ctx:sha256:d84141c3995ad070cf0b28b86f770ef757bfb3ee5240072fc996b2b78fa4abff#chunk:c000001`.
- [x] Workspace-local provenance anchor recorded as metadata/provenance only. Evidence: `ctx:sha256:ab4c3060e772d502014ab440b9e34d0ee916242ea9a6e6b3656566dfc21366f1#chunk:c000001`.
- [x] Packet records the truthful caveat that the referenced `.runs/.../memory/source-0/source.txt` payload is not present in this checkout and that the issue body contract comes from the parent-owned live `linear issue-context` read and workpad. Evidence: `docs/PRD-linear-6ef38dcf-eee6-4e2a-a261-179a040b52f3.md`, `docs/TECH_SPEC-linear-6ef38dcf-eee6-4e2a-a261-179a040b52f3.md`.
- [x] Parent/child ownership split recorded. Evidence: this checklist, the PRD, and the TECH_SPEC readiness gate.

## Parent Implementation Acceptance
- [ ] Issue-context cache artifacts are keyed by issue id so later cross-issue reads cannot overwrite the authoritative cached payload for the parent issue. Evidence: pending parent runtime diff and focused regression.
- [ ] `getProviderLinearIssueContext(...)` and authoritative same-run cache consumers resolve issue-specific cache truth deterministically. Evidence: pending parent focused regression.
- [ ] `providerMergeCloseout.ts` or any equivalent bounded same-run cache consumer no longer relies on one ambiguous singleton cache artifact. Evidence: pending parent focused regression.
- [ ] Focused regression coverage reproduces the `CO-301` multi-issue read shape and proves later cross-issue reads do not overwrite parent issue evidence. Evidence: pending parent test run.
- [ ] Run-artifact and docs-first packet traceability point to issue-specific evidence instead of a singleton path that can later contain a different issue body. Evidence: pending parent docs update and review.

## Not Done If
- [ ] A later cross-issue read can still overwrite the same apparent parent-authoritative path.
- [ ] Downstream docs/task packets can still cite a parent cache path that now contains a different issue body.
- [ ] Runtime readers still depend on one ambiguous singleton cache artifact for authoritative issue-specific truth.
- [ ] The fix drifts into generic Linear truth, PR attachment ownership, stale-blocker reconcile redesign, or a broad provider-worker issue-context rewrite.

## Validation
- [x] Child lane stayed inside the six declared files. Evidence: final scoped `git status --short`.
- [x] Child lane fixed-string protected-term grep over the six packet files. Evidence: scoped `rg -F` loop over `provider-linear-issue-context-cache.json`, `issue-context`, `run-scoped artifact`, `cross-issue reads`, `CO-301`, `CO-295`, `CO-299`, `CO-302`, `parent issue evidence`, and `docs-first packet` returned `protected-term check ok`.
- [x] Child lane `git diff --check --` over the six packet files. Evidence: scoped `git diff --check -- docs/PRD-linear-6ef38dcf-eee6-4e2a-a261-179a040b52f3.md docs/TECH_SPEC-linear-6ef38dcf-eee6-4e2a-a261-179a040b52f3.md docs/ACTION_PLAN-linear-6ef38dcf-eee6-4e2a-a261-179a040b52f3.md tasks/specs/linear-6ef38dcf-eee6-4e2a-a261-179a040b52f3.md tasks/tasks-linear-6ef38dcf-eee6-4e2a-a261-179a040b52f3.md .agent/task/linear-6ef38dcf-eee6-4e2a-a261-179a040b52f3.md` returned clean.
- [ ] Parent focused facade regression for the `CO-301` multi-issue read shape. Evidence: pending parent test run.
- [ ] Parent focused same-run consumer regression for issue-specific cache selection. Evidence: pending parent test run.
- [ ] Parent docs-review and implementation review after source edits. Evidence: pending parent review artifacts.

## Handoff Status
- [x] Child lane leaves the six packet files in place for patch export. Evidence: dirty working tree in this child workspace.
- [ ] Parent accepts the patch artifact and proceeds with implementation. Evidence: pending parent decision.
- [ ] Parent updates shared registries, workpad state, runtime code, tests, and PR lifecycle. Evidence: pending parent lane.

## Progress Log
- 2026-04-22: Created the six-file docs-first packet for `CO-305` only.
- 2026-04-22: Preserved the exact protected terms `provider-linear-issue-context-cache.json`, `issue-context`, `run-scoped artifact`, `cross-issue reads`, `CO-301`, `CO-295`, `CO-299`, `CO-302`, `parent issue evidence`, and `docs-first packet`.
- 2026-04-22: Kept the scope narrow on cache persistence truth and authoritative downstream consumers, and rejected generic Linear truth, PR attachment ownership, stale-blocker reconcile redesign, broad issue-context rewrites, and docs-only mitigation that leaves overwrite behavior intact.
- 2026-04-22: Completed scoped child-lane validation only: protected-term coverage, whitespace/diff sanity, and final scoped file-status verification.

## Relevant Files
- `docs/PRD-linear-6ef38dcf-eee6-4e2a-a261-179a040b52f3.md`
- `docs/TECH_SPEC-linear-6ef38dcf-eee6-4e2a-a261-179a040b52f3.md`
- `docs/ACTION_PLAN-linear-6ef38dcf-eee6-4e2a-a261-179a040b52f3.md`
- `tasks/specs/linear-6ef38dcf-eee6-4e2a-a261-179a040b52f3.md`
- `tasks/tasks-linear-6ef38dcf-eee6-4e2a-a261-179a040b52f3.md`
- `.agent/task/linear-6ef38dcf-eee6-4e2a-a261-179a040b52f3.md`

## Notes
- Do not widen into generic Linear truth.
- Do not widen into PR attachment ownership or merge-closeout correctness redesign.
- Do not widen into stale-blocker reconcile redesign.
- Do not accept a docs-only mitigation that leaves overwrite behavior intact.
