# PRD - CO-511 docs:freshness:maintain terminal owner replacement for CO-102 packet rows

## Traceability
- Linear issue: `CO-511` / `df57f3cf-2e2e-4d29-a484-a8f3cd92e7c5`
- Task id: `linear-df57f3cf-2e2e-4d29-a484-a8f3cd92e7c5`
- Canonical spec: `tasks/specs/linear-df57f3cf-2e2e-4d29-a484-a8f3cd92e7c5.md`
- Canonical registry id: `20260507-linear-df57f3cf-2e2e-4d29-a484-a8f3cd92e7c5`
- Canonical owner key: `docs:freshness:maintain`
- Canonical owner marker: `codex-orchestrator:canonical-owner-key=docs:freshness:maintain`
- Source anchor: `ctx:sha256:1998b27dfb57df81c7bce5beae2cce65c7f18b7398366940d62586fab83b5599#chunk:c000001`
- Source manifest: `.runs/linear-df57f3cf-2e2e-4d29-a484-a8f3cd92e7c5-co511-packet-docs/cli/2026-05-07T03-34-10-435Z-a35ba55b/manifest.json`
- Source payload note: the referenced `.runs/.../memory/source-0/source.txt` path was not present in this child-lane checkout, so this packet is anchored on the bounded child-lane prompt and protected terms.

## Summary
- Problem Statement: CO-511 needs a docs-first packet for a `docs:freshness:maintain` maintenance lane that protects the clean-main baseline while handling terminal owner replacement for historical CO-102 packet rows carrying `last_review=2026-04-06`.
- Desired Outcome: preserve the accepted CO-511 packet and complete the parent lane owner repair: live CO-511 owner evidence, registry mirrors, completed-lane source-spec reclassification, validation, PR lifecycle, Linear state, and final handoff without losing the exact issue contract.

## User Request Translation
- User intent / needs:
  - accept the CO-511 docs-first packet files listed in the bounded child-lane prompt
  - perform the parent-owned owner metadata, registry mirror, source-spec reclassification, validation, PR, workpad, and Linear lifecycle work in the CO-511 lane
  - preserve protected terms: `docs:freshness:maintain`, canonical owner key, clean-main baseline, terminal owner replacement, CO-102 packet rows, `last_review=2026-04-06`, and validation gate
  - keep CO-511 separate from CO-507 and from unrelated provider-worker behavior
  - make the packet explicit about rejecting blind `last_review` bumps, docs freshness/spec-guard weakening, and historical CO-102 packet deletion
- Success criteria / acceptance:
  - all six declared packet files exist and reference the same task id
  - acceptance criteria, non-goals, Not Done If conditions, and validation requirements are visible across the packet surfaces
  - parent-owned owner metadata, registry mirrors, source-spec reclassification, validation, PR, workpad, and Linear lifecycle are completed under live CO-511 evidence
  - protected-term scan across the six packet files finds the exact CO-511 terms
- Constraints / non-goals:
  - child-lane patch must not edit `docs/docs-catalog.json`, `docs/docs-freshness-registry.json`, `docs/TASKS.md`, or `tasks/index.json`
  - child-lane patch must not call Linear or GitHub mutation helpers
  - child-lane patch must not run full repo validation suites
  - do not fold this lane into CO-507

## Intent Checksum
- Exact user wording / phrases to preserve:
  - `docs:freshness:maintain`
  - canonical owner key
  - clean-main baseline
  - terminal owner replacement
  - CO-102 packet rows
  - `last_review=2026-04-06`
  - validation gate
  - blind `last_review` bumps
  - historical CO-102 packet deletion
  - folding this into CO-507
- Protected terms / exact artifact and surface names:
  - `docs/PRD-linear-df57f3cf-2e2e-4d29-a484-a8f3cd92e7c5.md`
  - `docs/TECH_SPEC-linear-df57f3cf-2e2e-4d29-a484-a8f3cd92e7c5.md`
  - `docs/ACTION_PLAN-linear-df57f3cf-2e2e-4d29-a484-a8f3cd92e7c5.md`
  - `tasks/specs/linear-df57f3cf-2e2e-4d29-a484-a8f3cd92e7c5.md`
  - `tasks/tasks-linear-df57f3cf-2e2e-4d29-a484-a8f3cd92e7c5.md`
  - `.agent/task/linear-df57f3cf-2e2e-4d29-a484-a8f3cd92e7c5.md`
  - parent-owned `docs/docs-catalog.json`
  - parent-owned `docs/docs-freshness-registry.json`
  - parent-owned `docs/TASKS.md`
  - parent-owned `tasks/index.json`
- Nearby wrong interpretations to reject:
  - treating `last_review=2026-04-06` as a date to bump blindly
  - deleting or hiding historical CO-102 packet rows to clear the gate
  - weakening `docs:freshness:maintain`, `docs:freshness`, spec-guard, or the validation gate
  - treating the clean-main baseline as proof that changed-path validation can be skipped
  - folding this work into CO-507 or any broader docs-freshness lane

## Parity / Alignment Matrix

| Surface | Current Truth | Reference Truth | Target Truth | Explicitly Out Of Scope |
| --- | --- | --- | --- | --- |
| Accepted child packet | The bounded child lane produced the six packet files. | Docs-first lanes carry PRD, TECH_SPEC, ACTION_PLAN, canonical task spec, task checklist, and `.agent/task` mirror before implementation. | Six packet files exist, are concise, and carry the protected CO-511 terms. | Additional child-lane mutation of registry, owner, PR, or Linear lifecycle surfaces. |
| `docs:freshness:maintain` owner truth | CO-444 is terminal and cannot own current `docs:freshness:maintain` debt. | Terminal owners must be replaced through canonical owner key evidence, not by weakening owner-truth gates. | CO-511 is the live owner issue stamped with the exact canonical owner marker. | Classifier code changes, policy weakening, or duplicate owner churn. |
| CO-102 packet rows | Historical CO-102 packet rows include `last_review=2026-04-06`. | Historical rows are evidence and must not be deleted or blindly refreshed. | Completed-lane packet/spec rows are archived or reclassified under live CO-511 owner evidence, with `completed_at` where applicable. | Historical CO-102 packet deletion or blind `last_review` bumps. |
| Clean-main baseline | The issue depends on proving whether the blocker exists on clean main versus the active diff. | Clean-main baseline evidence separates repo debt from active-lane changes. | Parent validation proves the `docs:freshness:maintain` cluster no longer reports `block_unowned_repo_debt`. | Weakening `docs:freshness`, `docs:freshness:maintain`, or `spec-guard`. |

## Not Done If
- Any packet file omits `docs:freshness:maintain`, canonical owner key, clean-main baseline, terminal owner replacement, CO-102 packet rows, `last_review=2026-04-06`, or validation gate.
- The packet describes blind `last_review` bumps, docs freshness/spec-guard weakening, or historical CO-102 packet deletion as acceptable.
- CO-511 is folded into CO-507 or another broader lane.
- Parent-owned registry mirrors, owner metadata, completed-lane source-spec reclassification, Linear workpad/state, PR lifecycle, or validation surfaces lack live CO-511 evidence.
- The packet implies a clean-main baseline removes the need for validation gate evidence.

## Goals
- Preserve the accepted CO-511 docs-first packet files.
- Restore live CO-511 ownership for `docs:freshness:maintain`.
- Reclassify or archive the completed-lane CO-102 stale packet rows under live evidence.
- Preserve exact protected wording and issue boundaries.
- Keep parent-owned validation and owner metadata responsibilities explicit.
- Keep historical CO-102 packet rows and `last_review=2026-04-06` visible as evidence, not automatic refresh targets.

## Non-Goals
- No owner metadata edits from the child lane.
- No registry mirror edits from the child lane.
- No `docs/TASKS.md` or `tasks/index.json` edits from the child lane.
- No Linear or GitHub mutations from the child lane.
- No validation-suite execution from the child lane.
- No deletion, hiding, or blind refresh of historical CO-102 packet evidence.

## Stakeholders
- Product: CO operators relying on truthful docs-freshness ownership.
- Engineering: CO-511 parent lane and docs freshness maintainers.
- Review: parent lane reviewing and importing the child patch artifact.

## Metrics & Guardrails
- Primary Success Metrics:
  - six scoped packet files are created
  - protected-term scan across scoped packet files passes
  - live CO-511 owner evidence replaces terminal CO-444 for the cluster
  - parent-owned metadata, registry, validation, PR, workpad, and Linear lifecycle surfaces remain evidence-backed
- Guardrails / Error Budgets:
  - zero child-lane edits outside declared packet scope
  - zero child-lane Linear/GitHub mutations
  - zero policy weakening or historical evidence deletion

## Technical Considerations
- Architectural Notes:
  - The accepted child lane is packet-only; it intentionally did not register the task in parent-owned indexes.
  - The parent lane performs live owner-truth checks, clean-main baseline checks, registry mirror updates, source-spec reclassification, validation gate execution, and PR/Linear lifecycle work.
- Dependencies / Integrations:
  - parent-owned `docs:freshness:maintain`
  - parent-owned `docs/docs-catalog.json`
  - parent-owned `docs/docs-freshness-registry.json`
  - parent-owned `docs/TASKS.md`
  - parent-owned `tasks/index.json`

## Fallback / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? Yes.
- Decision: `remove fallback` for the historical CO-102 packet-row freshness seam after parent classification; the parent reclassified the stale rows under live owner evidence instead of retaining an expired fallback.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `docs:freshness:maintain` | Historical CO-102 packet rows with `last_review=2026-04-06` | `remove fallback` | CO-511 parent lane | terminal owner replacement plus clean-main baseline validation gate | 2026-04-06 | 2026-05-07 | Removed on 2026-05-07 | Completed-lane packet/spec rows are archived or reclassified under live CO-511 owner evidence, with no retained fallback before handoff | Parent-owned `docs:freshness:maintain -- --format json`, `npm run docs:freshness`, and `node scripts/spec-guard.mjs --dry-run` |

- Large-refactor decision: bounded metadata repair; no large refactor is warranted because CO-511 removes the stale active freshness seam for this completed-lane residue instead of adding another owner-routing branch.
- Minor-seam decision: remove the minor docs-freshness seam now by archiving or reclassifying the April 6 completed-lane rows under live CO-511 owner evidence.

## Open Questions
- None for packet creation. Parent owns any live owner-state or validation questions.

## Approvals
- Product: CO-511 bounded child-lane prompt
- Engineering: packet-only child lane, 2026-05-07
- Design: N/A
