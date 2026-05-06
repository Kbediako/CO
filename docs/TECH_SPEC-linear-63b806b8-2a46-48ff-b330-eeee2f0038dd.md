---
id: 20260507-linear-63b806b8-2a46-48ff-b330-eeee2f0038dd
title: "CO-505 docs/TASKS historical path normalization"
relates_to: docs/PRD-linear-63b806b8-2a46-48ff-b330-eeee2f0038dd.md
risk: medium
owners:
  - Codex
last_review: 2026-05-07
related_action_plan: docs/ACTION_PLAN-linear-63b806b8-2a46-48ff-b330-eeee2f0038dd.md
task_checklists:
  - tasks/tasks-linear-63b806b8-2a46-48ff-b330-eeee2f0038dd.md
---

# TECH_SPEC - CO-505 docs/TASKS historical path normalization

## Canonical Reference
- PRD: `docs/PRD-linear-63b806b8-2a46-48ff-b330-eeee2f0038dd.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-63b806b8-2a46-48ff-b330-eeee2f0038dd.md`
- Canonical task spec: `tasks/specs/linear-63b806b8-2a46-48ff-b330-eeee2f0038dd.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-63b806b8-2a46-48ff-b330-eeee2f0038dd.md`
- Task checklist: `tasks/tasks-linear-63b806b8-2a46-48ff-b330-eeee2f0038dd.md`
- `.agent` mirror: `.agent/task/linear-63b806b8-2a46-48ff-b330-eeee2f0038dd.md`
- Linear issue: `CO-505`
- Issue contract source anchor: `ctx:sha256:f6df0cd43c7fd87ced32d0e8e02d78b6c4bfecdd0101b7e7842036baee221aaf#chunk:c000001`
- Child-lane run source anchor: `ctx:sha256:9162b6d23db3df6c0bb33e8c326c782fc46c9471ade9462f9710744d3fec4728#chunk:c000001`

## Summary
- Objective: normalize historical in-repo evidence references in `docs/TASKS.md` from machine-local or depth-dependent path forms to portable repo-relative paths.
- Scope:
  - inventory `docs/TASKS.md` references containing `/Users/kbediako` and `../../.runs`
  - convert in-repo evidence references to repo-relative paths such as `.runs/...`, `out/...`, `orchestrator/...`, `tasks/...`, or `docs/...`
  - preserve historical task meaning and issue/PR context
  - annotate genuinely external references that cannot be repo-relative
  - create/register the CO-505 packet and validation evidence through parent-owned surfaces
- Constraints:
  - keep `CO-503` stale-spec classification metadata out of scope
  - do not delete historical evidence to clear a path-hygiene issue
  - do not weaken docs checks
  - child lane owns only the six declared docs packet files

## Issue-Shaping Contract
- User-request translation carried forward: `CO-505` is the path-hygiene follow-up split from `CO-503` / PR `#781`; it must make `docs/TASKS.md` historical in-repo evidence paths portable without changing the stale-spec classification work that `CO-503` already completed.
- Protected terms / exact artifact and surface names:
  - `normalize docs/TASKS.md historical in-repo evidence paths`
  - `/Users/kbediako`
  - `../../.runs`
  - `repo-relative references`
  - `.runs/...`
  - `out/...`
  - `orchestrator/...`
  - `tasks/...`
  - `docs/...`
  - `preserve historical meaning`
  - `document external exceptions`
  - `keep CO-503 stale-spec classification metadata out of scope`
  - `CO-503`
  - PR `#781`
  - `npm run docs:check`
  - `npm run docs:freshness`
- Nearby wrong interpretations to reject:
  - refreshing or reclassifying stale specs as part of this cleanup
  - deleting historical `docs/TASKS.md` entries or packet evidence
  - converting truly external provenance into inaccurate repo-relative paths
  - leaving in-repo paths in non-portable absolute or upward-traversal forms
  - changing source code, tests, docs guard behavior, Linear, GitHub, PR, or workpad state from the docs-packet child lane
- Explicit non-goals carried forward:
  - no `CO-503` stale-spec metadata changes
  - no product/source/test changes
  - no docs check weakening
  - no child-lane edits to `docs/TASKS.md`, `tasks/index.json`, or `docs/docs-freshness-registry.json`
  - no Linear or GitHub lifecycle actions by the docs-packet child lane

## Parity / Alignment Matrix

| Surface | Current truth | Reference truth | Target truth | Explicitly out-of-scope differences |
| --- | --- | --- | --- | --- |
| `docs/TASKS.md` absolute in-repo paths | The parent workpad records an initial inventory finding `/Users/kbediako` references. | Historical in-repo evidence should survive checkout relocation. | In-repo absolute paths become repo-relative paths. | Rewriting the historical event, issue, or PR facts attached to the path. |
| `docs/TASKS.md` upward run paths | The parent workpad records an initial inventory finding `../../.runs` references. | In-repo run artifacts should be referenced from the repo root. | Upward-traversal run paths become `.runs/...`. | Moving or regenerating `.runs` artifacts. |
| External exceptions | Some paths may point outside the repo and cannot be safely relativized. | External provenance is allowed only when clearly marked as external. | Genuine external references remain with an explicit exception note. | Falsely claiming external evidence is repo-local. |
| `CO-503` stale-spec metadata | CO-503 completed stale-spec classification and split this path cleanup to CO-505. | CO-505 is a path-hygiene follow-up, not a stale-spec reclassification lane. | `CO-503` metadata is unchanged except for path references if they appear in `docs/TASKS.md`. | `last_review`, owner status, terminal classifications, and docs-freshness status changes from CO-503. |
| Validation | Parent owns final checks after implementation. | Docs gates must validate the normalized metadata. | `npm run docs:check` and `npm run docs:freshness` pass after cleanup. | Full repo validation from this docs-only child lane. |

## Readiness Gate
- Not done if:
  - unannotated in-repo `/Users/kbediako` paths remain in `docs/TASKS.md`
  - in-repo run evidence still uses `../../.runs`
  - external references are either incorrectly normalized or not clearly annotated
  - historical meaning or provenance is lost
  - `CO-503` stale-spec classification metadata changes
  - `npm run docs:check` or `npm run docs:freshness` fails after cleanup
- Pre-implementation issue-quality review evidence:
  - 2026-05-07: the issue is not narrower than the user request because it names the exact path families, target file, required external exception handling, validation gates, and explicit `CO-503` non-goal.
  - 2026-05-07: micro-task path is inappropriate because correctness depends on exact protected wording, historical evidence preservation, and parity/alignment between current brittle references and portable repo-relative references.
- Safeguard ownership split:
  - parent lane owns live Linear state, workpad, `docs/TASKS.md`, registry mirrors, implementation, validation, PR, review, and handoff
  - docs-packet child lane owns only PRD, TECH_SPEC canonical/mirror, ACTION_PLAN, task checklist, and `.agent` mirror

## Technical Requirements
- Functional requirements:
  - Inventory all `docs/TASKS.md` references matching `/Users/kbediako` and `../../.runs` before editing.
  - For each in-repo `/Users/kbediako/.../CO/...` evidence reference, replace only the path prefix/shape needed to make it repo-relative.
  - For each in-repo `../../.runs/...` evidence reference, rewrite it as `.runs/...`.
  - Preserve issue identifiers, PR numbers, command names, timestamps, and evidence meaning around each normalized reference.
  - Identify genuine external references and annotate them as external instead of converting them to a misleading repo-relative path.
  - Keep `CO-503` stale-spec classification metadata unchanged.
  - Run and record docs validation after the cleanup.
- Non-functional requirements:
  - Keep the patch metadata-only and reviewable.
  - Prefer deterministic textual normalization over broad editorial rewrites.
  - Do not weaken guard scripts, freshness gates, or docs checks.
  - Do not rely on machine-local path existence as validation.
- Interfaces / contracts:
  - `docs/TASKS.md` remains the review-facing active-task snapshot.
  - Repo-relative paths are relative to the repository root.
  - External exception annotations must make clear why a path is not repo-relative.

## Fallback Expiry / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? `Yes`.
- Required decision table:

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `docs/TASKS.md` in-repo absolute paths | Historical evidence stored as machine-local `/Users/kbediako` paths. | remove fallback | CO-505 | CO-503 review handoff split outside-diff path cleanup. | historical | 2026-05-07 | N/A after removal | In-repo evidence paths are repo-relative or annotated external. | inventory, `npm run docs:check`, `npm run docs:freshness` |
| `docs/TASKS.md` upward `.runs` paths | Historical run evidence stored as `../../.runs/...`. | remove fallback | CO-505 | CO-503 review handoff split outside-diff path cleanup. | historical | 2026-05-07 | N/A after removal | In-repo run evidence uses `.runs/...`. | inventory, `npm run docs:check`, `npm run docs:freshness` |
| `docs/TASKS.md` external provenance | A path can be real evidence but outside the repo root. | justify retaining fallback | CO-505 | Inventory proves the target is external rather than in-repo. | historical | 2026-05-07 | N/A, external provenance | External reference is explicitly annotated and remains historically meaningful. | inventory plus review-visible exception note |

- For `justify retaining fallback`: the retained contract is `external-provenance-reference`, owned by CO-505 for this cleanup surface. Steady-state proof is the parent inventory showing the reference cannot be represented as repo-relative without lying about location. Tests/docs are the final `docs/TASKS.md` exception annotation plus docs validation.
- Large-refactor check: not applicable. The path cleanup is a bounded docs metadata repair with no code behavior seam.

## Architecture & Data
- Architecture / design adjustments: none.
- Data model changes / migrations: none.
- External dependencies / integrations:
  - parent-owned Linear/workpad state for lifecycle tracking
  - parent-owned docs validation commands
  - review evidence from the child-lane manifest and packet patch

## Validation Plan
- Tests / checks:
  - path inventory for `/Users/kbediako` and `../../.runs` in `docs/TASKS.md`
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - parent-required broader validation floor before review handoff
  - manifest-backed standalone review and explicit elegance/minimality pass if the parent final diff is non-trivial
- Rollout verification:
  - parent workpad records child packet acceptance, normalization inventory, validation output, review result, PR attachment, and `ready-review` drain
- Monitoring / alerts:
  - no runtime monitoring required; docs validation and review feedback are the proof surfaces

## Open Questions
- Parent implementation should define the exact external exception wording after the full inventory identifies any non-repo paths.

## Approvals
- Reviewer: docs-review / standalone review pending
- Date: 2026-05-07
