# PRD - CO-505 docs/TASKS historical path normalization

## Traceability
- Linear issue: `CO-505` / `63b806b8-2a46-48ff-b330-eeee2f0038dd`
- Task id: `linear-63b806b8-2a46-48ff-b330-eeee2f0038dd`
- Canonical spec: `tasks/specs/linear-63b806b8-2a46-48ff-b330-eeee2f0038dd.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-63b806b8-2a46-48ff-b330-eeee2f0038dd.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-63b806b8-2a46-48ff-b330-eeee2f0038dd.md`
- Task checklist: `tasks/tasks-linear-63b806b8-2a46-48ff-b330-eeee2f0038dd.md`
- `.agent` mirror: `.agent/task/linear-63b806b8-2a46-48ff-b330-eeee2f0038dd.md`
- Issue contract source anchor: `ctx:sha256:f6df0cd43c7fd87ced32d0e8e02d78b6c4bfecdd0101b7e7842036baee221aaf#chunk:c000001`
- Child-lane run source anchor: `ctx:sha256:9162b6d23db3df6c0bb33e8c326c782fc46c9471ade9462f9710744d3fec4728#chunk:c000001`
- Child-lane manifest: `.runs/linear-63b806b8-2a46-48ff-b330-eeee2f0038dd-docs-packet/cli/2026-05-06T21-26-39-696Z-11dba66f/manifest.json`

## Summary
- Problem Statement: `docs/TASKS.md` contains historical in-repo evidence references that depend on machine-local `/Users/kbediako` paths or upward traversal such as `../../.runs`, making review evidence brittle and non-portable.
- Desired Outcome: historical in-repo evidence paths in `docs/TASKS.md` are normalized to repo-relative references while preserving historical meaning, documenting genuine external exceptions, and leaving `CO-503` stale-spec classification metadata out of scope.

## User Request Translation
- User intent / needs: create and execute a narrow path-hygiene follow-up for `docs/TASKS.md` so in-repo historical evidence points to portable repo-relative locations instead of local workstation or depth-dependent paths.
- Success criteria / acceptance:
  - inventory current `docs/TASKS.md` machine-local absolute paths and upward-traversal run paths
  - convert in-repo evidence references to repo-relative paths such as `.runs/...`, `out/...`, `orchestrator/...`, `tasks/...`, or `docs/...`
  - preserve or explicitly annotate genuinely external references that cannot be repo-relative
  - keep `CO-503` / PR `#781` scope limited to this path-hygiene follow-up rather than stale-spec classification
  - prove `npm run docs:check` and `npm run docs:freshness` after the cleanup
- Constraints / non-goals:
  - no `CO-503` stale-spec classification metadata changes
  - no deletion or rewriting of historical task meaning
  - no source code, tests, guard behavior, Linear mutation, GitHub, PR, or workpad ownership from the docs-packet child lane
  - no registry mirror edits in this docs-packet child lane

## Intent Checksum
- Exact user wording / phrases to preserve:
  - `normalize docs/TASKS.md historical in-repo evidence paths`
  - `/Users/kbediako`
  - `../../.runs`
  - `repo-relative references`
  - `preserve historical meaning`
  - `document external exceptions`
  - `keep CO-503 stale-spec classification metadata out of scope`
  - `CO-503`
  - PR `#781`
  - `path-hygiene follow-up`
  - `npm run docs:check`
  - `npm run docs:freshness`
- Protected artifact and surface names:
  - `docs/TASKS.md`
  - `tasks/index.json`
  - `docs/docs-freshness-registry.json`
  - `.runs/...`
  - `out/...`
  - `orchestrator/...`
  - `tasks/...`
  - `docs/...`
  - `docs/PRD-linear-63b806b8-2a46-48ff-b330-eeee2f0038dd.md`
  - `docs/TECH_SPEC-linear-63b806b8-2a46-48ff-b330-eeee2f0038dd.md`
  - `docs/ACTION_PLAN-linear-63b806b8-2a46-48ff-b330-eeee2f0038dd.md`
  - `tasks/specs/linear-63b806b8-2a46-48ff-b330-eeee2f0038dd.md`
  - `tasks/tasks-linear-63b806b8-2a46-48ff-b330-eeee2f0038dd.md`
  - `.agent/task/linear-63b806b8-2a46-48ff-b330-eeee2f0038dd.md`
- Nearby wrong interpretations to reject:
  - changing `CO-503` stale-spec status, owner, `last_review`, or registry classification metadata
  - deleting historical evidence instead of preserving it with portable paths
  - converting genuinely external references to misleading repo-relative paths
  - normalizing only one path family while leaving unannotated in-repo `/Users/kbediako` or `../../.runs` references
  - weakening docs checks to tolerate brittle evidence paths
  - broadening this child lane into parent-owned `docs/TASKS.md`, `tasks/index.json`, or `docs/docs-freshness-registry.json` edits

## Parity / Alignment Matrix

| Surface | Current truth | Reference truth | Target truth | Explicitly out of scope |
| --- | --- | --- | --- | --- |
| `docs/TASKS.md` `/Users/kbediako` paths | Initial inventory found machine-local references in the active task snapshot. | In-repo evidence should be portable across checkouts. | In-repo paths are rewritten to repo-relative references, while genuine external references are annotated. | Rewriting evidence meaning or deleting historical entries. |
| `docs/TASKS.md` `../../.runs` paths | Initial inventory found depth-dependent run artifact references. | Run artifact evidence should use repo-relative `.runs/...` paths when it is in this repo. | In-repo upward-traversal run paths become `.runs/...` references. | Moving or regenerating run artifacts. |
| External references | Some absolute paths may identify genuinely external workspaces, sessions, or artifacts. | External provenance can remain when it is truthful and explicitly identified. | Non-repo references are preserved with an external exception note instead of being falsely relativized. | Forcing every absolute path into a repo-relative shape. |
| `CO-503` / PR `#781` scope | `CO-503` split this outside-diff cleanup to `CO-505`. | `CO-503` stale-spec classification metadata was already handled in PR `#781`. | `CO-505` changes only path-hygiene evidence references and related packet/registration metadata. | Reclassifying stale specs, changing `last_review`, or reopening `CO-503` decisions. |
| Validation gates | Parent will own implementation and validation after accepting this packet. | Docs hygiene must pass after path normalization. | `npm run docs:check` and `npm run docs:freshness` pass after cleanup. | Full repo validation from the docs-packet child lane. |

## Not Done If
- Unannotated in-repo `/Users/kbediako` paths remain in `docs/TASKS.md`.
- In-repo run artifact references still use `../../.runs` or another depth-dependent traversal form.
- Historical evidence meaning, task provenance, or PR/issue context is lost while normalizing paths.
- Genuinely external references are converted to incorrect repo-relative paths or left without an exception note.
- `CO-503` stale-spec classification metadata, terminal-state decisions, or `last_review` evidence are changed.
- `npm run docs:check` or `npm run docs:freshness` fails after the parent cleanup.

## Goals
- Inventory the current `docs/TASKS.md` path-hygiene debt.
- Normalize in-repo historical evidence paths to portable repo-relative references.
- Preserve historical task meaning and provenance.
- Document external exceptions clearly when a path cannot be repo-relative.
- Keep the cleanup separate from `CO-503` stale-spec classification.
- Provide a complete docs-first packet for parent implementation, validation, and review handoff.

## Non-Goals
- No stale-spec classification, owner-state, `last_review`, or docs-freshness status changes from `CO-503`.
- No source code, test, guard, CLI, or runtime behavior changes.
- No deletion of historical packet evidence or task snapshots.
- No Linear, GitHub, PR lifecycle, or workpad mutation by the docs-packet child lane.
- No edits to `docs/TASKS.md`, `tasks/index.json`, or `docs/docs-freshness-registry.json` by the docs-packet child lane.

## Stakeholders
- Product: CO operators relying on `docs/TASKS.md` as a portable active-task snapshot.
- Engineering: docs hygiene, docs freshness, and review evidence owners.
- Design: N/A.

## Metrics & Guardrails
- Primary Success Metrics:
  - inventory records each relevant `/Users/kbediako` and `../../.runs` reference before edit
  - all in-repo evidence paths in scope become repo-relative
  - external exceptions are explicit and truthful
  - `npm run docs:check` and `npm run docs:freshness` pass after the parent cleanup
- Guardrails / Error Budgets:
  - zero stale-spec classification metadata changes
  - zero source/test changes
  - zero unannotated external exceptions
  - zero registry or lifecycle edits from this child lane

## Technical Considerations
- Architectural Notes:
  - Prefer mechanical path normalization with explicit inventory evidence over semantic rewrites.
  - Treat `.runs/...`, `out/...`, `orchestrator/...`, `tasks/...`, and `docs/...` as acceptable repo-relative proof surfaces when the target is in the repo.
  - Preserve issue and PR identifiers around historical entries so review evidence remains understandable.
- Dependencies / Integrations:
  - Parent-owned `docs/TASKS.md` inventory and edits.
  - Parent-owned `tasks/index.json` / `docs/docs-freshness-registry.json` registration if needed.
  - Docs validation commands after parent implementation.

## Fallback / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? `Yes`.
- This lane touches historical/stale evidence path metadata. The intended decision is to remove brittle in-repo path forms, not retain a compatibility path.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `docs/TASKS.md` in-repo absolute paths | Machine-local `/Users/kbediako` evidence references make historical proof non-portable. | remove fallback | CO-505 | Path-hygiene follow-up from CO-503 review handoff. | historical | 2026-05-07 | N/A after removal | In-repo evidence uses repo-relative paths or is annotated external. | path inventory, `npm run docs:check`, `npm run docs:freshness` |
| `docs/TASKS.md` upward run paths | `../../.runs` depends on the file's current directory depth. | remove fallback | CO-505 | Path-hygiene follow-up from CO-503 review handoff. | historical | 2026-05-07 | N/A after removal | In-repo run artifact references use `.runs/...`. | path inventory, `npm run docs:check`, `npm run docs:freshness` |
| Genuine external references | Some provenance may refer to external workspaces or artifacts outside the repo. | justify retaining fallback | CO-505 | Reference cannot truthfully be represented as repo-relative. | historical | 2026-05-07 | N/A, external provenance | External reference is explicitly annotated and remains historically meaningful. | inventory plus reviewer-visible exception note |

- Durable retention evidence: historical entries remain in `docs/TASKS.md`; only path syntax and external annotations change.
- Large-refactor check: not applicable. This is a bounded docs metadata cleanup and does not introduce a code authority split.

## Open Questions
- Parent implementation should decide the exact annotation wording for any genuine external exceptions after the full inventory.

## Approvals
- Product: Linear CO-505, pending parent handoff
- Engineering: docs-review / standalone review pending
- Design: N/A
