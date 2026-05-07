# Task Checklist - linear-df57f3cf-2e2e-4d29-a484-a8f3cd92e7c5

- Linear Issue: `CO-511` / `df57f3cf-2e2e-4d29-a484-a8f3cd92e7c5`
- Primary PRD: `docs/PRD-linear-df57f3cf-2e2e-4d29-a484-a8f3cd92e7c5.md`
- TECH_SPEC: `tasks/specs/linear-df57f3cf-2e2e-4d29-a484-a8f3cd92e7c5.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-df57f3cf-2e2e-4d29-a484-a8f3cd92e7c5.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-df57f3cf-2e2e-4d29-a484-a8f3cd92e7c5.md`
- Agent mirror: `.agent/task/linear-df57f3cf-2e2e-4d29-a484-a8f3cd92e7c5.md`
- Canonical owner key: `docs:freshness:maintain`
- Canonical owner marker: `codex-orchestrator:canonical-owner-key=docs:freshness:maintain`
- Child manifest: `.runs/linear-df57f3cf-2e2e-4d29-a484-a8f3cd92e7c5-co511-packet-docs/cli/2026-05-07T03-34-10-435Z-a35ba55b/manifest.json`

## Docs-First
- [x] CO-511 PRD drafted with protected terms, acceptance criteria, non-goals, Not Done If, and parity matrix. Evidence: `docs/PRD-linear-df57f3cf-2e2e-4d29-a484-a8f3cd92e7c5.md`.
- [x] CO-511 TECH_SPEC mirror and canonical task spec drafted. Evidence: `docs/TECH_SPEC-linear-df57f3cf-2e2e-4d29-a484-a8f3cd92e7c5.md`, `tasks/specs/linear-df57f3cf-2e2e-4d29-a484-a8f3cd92e7c5.md`.
- [x] CO-511 ACTION_PLAN drafted with validation and parent/child ownership split. Evidence: `docs/ACTION_PLAN-linear-df57f3cf-2e2e-4d29-a484-a8f3cd92e7c5.md`.
- [x] `.agent/task` mirror drafted. Evidence: `.agent/task/linear-df57f3cf-2e2e-4d29-a484-a8f3cd92e7c5.md`.

## Scope Boundaries
- [x] Child lane kept to the declared packet files only. Evidence: no `docs/docs-catalog.json`, `docs/docs-freshness-registry.json`, `docs/TASKS.md`, or `tasks/index.json` edits.
- [x] Parent-owned responsibilities recorded. Evidence: packet names owner metadata, registry mirrors, validation, PR, workpad, and Linear lifecycle as parent-owned.
- [x] Protected terms preserved. Evidence: packet includes `docs:freshness:maintain`, canonical owner key, clean-main baseline, terminal owner replacement, CO-102 packet rows, `last_review=2026-04-06`, and validation gate.

## CO-382 Fallback Decision Table
- Large-refactor decision: bounded metadata repair; no large refactor is warranted because CO-511 removes the stale active freshness seam for this completed-lane residue instead of adding another owner-routing branch.
- Minor-seam decision: remove the minor docs-freshness seam now by archiving or reclassifying the April 6 completed-lane rows under live CO-511 owner evidence.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `docs:freshness:maintain` | Historical CO-102 packet rows with `last_review=2026-04-06` | `remove fallback` | CO-511 parent lane | Terminal owner replacement plus clean-main baseline validation gate | 2026-04-06 | 2026-05-07 | Removed on 2026-05-07 | Completed-lane packet/spec rows are archived or reclassified under live CO-511 owner evidence, with no retained fallback before handoff | Parent-owned `docs:freshness:maintain -- --format json`, `npm run docs:freshness`, and `node scripts/spec-guard.mjs --dry-run` |

## Not Done If
- Any packet file omits `docs:freshness:maintain`, canonical owner key, clean-main baseline, terminal owner replacement, CO-102 packet rows, `last_review=2026-04-06`, or validation gate.
- Blind `last_review` bumps are used, allowed, or cited as validation evidence.
- Historical CO-102 packet deletion is used, allowed, or cited as validation evidence.
- Docs freshness/spec-guard behavior or validation gate semantics are weakened.
- CO-511 is folded into CO-507.
- This child lane edits parent-owned owner metadata, registry mirrors, workpad, PR, Linear state, or validation surfaces.

## Acceptance Criteria
- [x] Six declared CO-511 packet files exist. Evidence: scoped file list.
- [x] Acceptance criteria, non-goals, Not Done If, and validation requirements are visible. Evidence: PRD, TECH_SPEC mirror, ACTION_PLAN, canonical task spec, checklist, and agent mirror.
- [x] Parent/child ownership split is explicit. Evidence: packet and mirror guardrails.
- [x] Parent imports patch artifact and updates registry/owner metadata. Evidence: `tasks/index.json`, `docs/docs-freshness-registry.json`, `docs/docs-catalog.json`, `docs/guides/docs-freshness-cohorts.md`.
- [x] Parent captures clean-main baseline and validation gate evidence. Evidence: `out/linear-df57f3cf-2e2e-4d29-a484-a8f3cd92e7c5/docs-freshness-maintenance.json`.
- [x] Canonical spec aligned with parent-owned owner/registry/reclassification work. Evidence: `tasks/specs/linear-df57f3cf-2e2e-4d29-a484-a8f3cd92e7c5.md`, `docs/PRD-linear-df57f3cf-2e2e-4d29-a484-a8f3cd92e7c5.md`, and `docs/TECH_SPEC-linear-df57f3cf-2e2e-4d29-a484-a8f3cd92e7c5.md`.
- [x] Reclassified completed task rows carry completion timing. Evidence: `tasks/index.json` includes `completed_at` for CO-97, CO-99, CO-100, and CO-102 rows.
- [ ] Parent completes PR, review, and Linear lifecycle. Evidence: parent-owned.

## Validation
- [x] Scoped packet file creation. Evidence: six files in declared scope.
- [x] Scoped protected-term scan. Evidence: scoped `rg` found `docs:freshness:maintain`, canonical owner key, clean-main baseline, terminal owner replacement, CO-102 packet rows, `last_review=2026-04-06`, validation gate, blind `last_review` bumps, historical CO-102 packet deletion, and folding this into CO-507 across the six packet files.
- [x] Scoped whitespace check. Evidence: trailing-whitespace scan across the six packet files returned clean; files remain untracked for parent patch export.
- [x] Parent registry/index validation. Evidence: `npm run docs:check`, `npm run docs:freshness`, and `npm run repo:stewardship`.
- [x] Parent `node scripts/spec-guard.mjs --dry-run`. Evidence: command returned `Spec guard: OK`.
- [x] Parent strict spec-guard rerun. Evidence: non-dry guard rerun after CI Core Lane failed on missing parseable CO-382 fallback decision tables returned `Spec guard: OK`.
- [x] Parent `npm run docs:freshness`. Evidence: command returned `docs:freshness OK - 5291 docs, 5294 registry entries`.
- [x] Parent `npm run docs:freshness:maintain -- --format json`. Evidence: `freshness_decision=clean`, `owner_issue=CO-511`, `candidate_cohorts=[]`, `blocking_changed_paths=[]`.

## Notes
- The source payload path referenced by the child prompt was not present in this child checkout, so the packet anchors to the source anchor, source manifest, child-lane prompt, and protected terms.
- No Linear or GitHub mutation helpers were called by this child lane.
