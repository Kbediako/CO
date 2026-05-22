# PRD - CO-423 restore docs freshness owner truth after terminal CO-409

## Traceability
- Linear issue: `CO-423` / `9becd8cd-7fe2-477e-bc59-816154364f90`
- Linear URL: https://linear.app/asabeko/issue/CO-423
- Task id: `linear-9becd8cd-7fe2-477e-bc59-816154364f90`
- Canonical spec: `tasks/specs/linear-9becd8cd-7fe2-477e-bc59-816154364f90.md`
- Canonical owner key: `docs:freshness:maintain`
- Shared source anchor: `ctx:sha256:4edecc88705767ae3d631a2b301196a40fa6fb16fa008b3e7cdd3edfecee2962#chunk:c000001`
- Source object id: `sha256:4edecc88705767ae3d631a2b301196a40fa6fb16fa008b3e7cdd3edfecee2962`
- Source payload path: `.runs/linear-9becd8cd-7fe2-477e-bc59-816154364f90-docs-packet/cli/2026-04-29T13-26-35-576Z-37f0d4ba/memory/source-0/source.txt`

## Summary
- Problem Statement: post-merge `origin/main` now reports `docs:freshness:maintain` as `block_unowned_repo_debt` because the configured owner is terminal: `owner_issue=CO-409`, `CO-409` is `Done`, `owner_issue_action.reason=configured_owner_terminal`, and `blocking_changed_paths=[]`.
- Desired Outcome: create the CO-423 docs-first packet so the parent lane can restore a live same-project owner for the `canonical owner key` `docs:freshness:maintain` without weakening `docs:freshness`, hiding the March 28 rolling cohort, or treating historical `CO-420` evidence as current owner truth.

## User Request Translation
- User intent / needs: produce only the CO-423 packet files for the parent lane, preserving the current post-merge owner truth and the distinction between current terminal `CO-409` evidence and historical-only `CO-420` evidence.
- Success criteria / acceptance:
  - PRD, canonical TECH_SPEC, TECH_SPEC mirror, ACTION_PLAN, task checklist, and `.agent` mirror exist for `linear-9becd8cd-7fe2-477e-bc59-816154364f90`.
  - The packet preserves the current owner evidence: `docs:freshness:maintain`, `block_unowned_repo_debt`, `configured_owner_terminal`, `owner_issue=CO-409`, `CO-409`, `blocking_changed_paths=[]`, `docs:freshness`, and `canonical owner key`.
  - The packet preserves historical-only context without promoting it: `owner_issue=CO-420`, `CO-420`, and `co-420-apr-28-march-28-task-packet-mirror`.
  - The packet names `docs/docs-catalog.json` as the parent-owned current metadata surface and explicitly forbids this child lane from editing it.
  - The packet rejects edits to `docs/docs-freshness-registry.json`, `tasks/index.json`, `docs/TASKS.md`, source code, package files, validation scripts, Linear state, GitHub state, PR lifecycle, or full-suite validation from this child lane.
- Constraints / non-goals:
  - this child lane edits only the six declared packet and task mirror files
  - no `docs/docs-catalog.json`, `docs/docs-freshness-registry.json`, `tasks/index.json`, `docs/TASKS.md`, source code, package files, or validation script changes
  - no Linear mutation helper calls, PR creation, PR transitions, or issue lifecycle actions
  - no full repo validation suites

## Intent Checksum
- Exact user wording / phrases to preserve:
  - `docs:freshness:maintain`
  - `block_unowned_repo_debt`
  - `configured_owner_terminal`
  - `owner_issue=CO-409`
  - `CO-409`
  - `owner_issue=CO-420`
  - `CO-420`
  - `blocking_changed_paths=[]`
  - `docs/docs-catalog.json`
  - `co-420-apr-28-march-28-task-packet-mirror`
  - `docs:freshness`
  - `canonical owner key`
- Protected artifact and surface names:
  - `docs/docs-catalog.json`
  - `docs/docs-freshness-registry.json`
  - `tasks/index.json`
  - `docs/TASKS.md`
  - `npm run docs:freshness`
  - `npm run docs:freshness:maintain`
- Nearby wrong interpretations to reject:
  - treating `owner_issue=CO-420` or `CO-420` as current live owner truth
  - treating `CO-409` as a usable current owner after it reached `Done`
  - treating `blocking_changed_paths=[]` as permission to bypass owner repair
  - deleting, hiding, or blindly date-bumping the March 28 rolling cohort
  - weakening `docs:freshness` or `docs:freshness:maintain`
  - broadening CO-423 into source-code, package, validation-script, Linear, GitHub, or PR lifecycle work in this child lane

## Parity / Alignment Matrix

| Surface | Current Truth | Reference Truth | Target Truth | Explicitly Out Of Scope |
| --- | --- | --- | --- | --- |
| `docs:freshness:maintain` owner truth | Post-merge `origin/main` reports `block_unowned_repo_debt` with `configured_owner_terminal`, `owner_issue=CO-409`, terminal `CO-409` `Done`, and `blocking_changed_paths=[]`. | Terminal configured owners are evidence only; the `canonical owner key` `docs:freshness:maintain` must route to a live same-project owner before owned rolling debt can pass. | Parent uses CO-423 to restore live owner truth for `docs:freshness:maintain` while preserving fail-closed terminal-owner behavior. | Weakening owner verification, treating terminal `CO-409` as live, or bypassing owner repair. |
| `docs/docs-catalog.json` | Rolling freshness owner metadata names `CO-409`, which is now terminal. | Catalog owner metadata should align to a live, verified owner or fail closed with machine-readable owner action. | Parent updates catalog ownership only after CO-423 implementation proves the live owner path. | This child lane editing `docs/docs-catalog.json`. |
| Historical CO-420 marker | Earlier artifacts mentioned `owner_issue=CO-420`, `CO-420`, and `co-420-apr-28-march-28-task-packet-mirror`. | Historical owner lineage remains useful evidence, but terminal historical owners are not current owner truth. | `CO-420` and `owner_issue=CO-420` stay historical-only context; the marker remains the declared cohort marker, not the current live owner. | Reusing terminal `CO-420` or deleting the declared cohort marker. |
| `docs:freshness` rolling cohort | The March 28 Task Packet / Task Mirror cohort remains machine-visible rolling debt. | Stale rolling rows should stay visible until reviewed, refreshed, archived, reclassified, or re-homed to a verified live owner. | Parent preserves visibility and validates with `docs:freshness` and `docs:freshness:maintain`. | Hiding rows, deleting docs, broad stale-doc cleanup, or changing freshness policy. |
| Packet ownership | CO-423 packet files do not exist at lane start. | Docs-first packets should carry user request translation, protected terms, non-goals, `Not Done If`, validation expectations, and parent/child boundaries. | This child lane creates the six declared packet/mirror files for parent patch import. | `tasks/index.json`, `docs/TASKS.md`, Linear, GitHub, and PR lifecycle. |

## Not Done If
- Any protected term is omitted or renamed.
- The packet implies `owner_issue=CO-420` or `CO-420` is the current live owner truth.
- The packet implies terminal `owner_issue=CO-409` / `CO-409` can keep satisfying `docs:freshness:maintain`.
- The packet treats `blocking_changed_paths=[]` as a waiver.
- The plan weakens `docs:freshness` or `docs:freshness:maintain`.
- The plan deletes, hides, or blindly date-bumps stale rows instead of preserving owner-truth repair.
- This child lane edits `docs/docs-catalog.json`, `docs/docs-freshness-registry.json`, `tasks/index.json`, `docs/TASKS.md`, source code, package files, or validation scripts.
- This child lane calls Linear mutation helpers, launches PR/Linear transitions, or runs full repo validation suites.

## Goals
- Create the CO-423 docs-first packet and task mirror docs.
- Preserve current post-merge owner evidence for `docs:freshness:maintain`.
- Preserve `CO-420` and `owner_issue=CO-420` as historical-only context.
- Make the parent-owned catalog/registry/task-index/validation/lifecycle boundary explicit.
- Leave changes in place for patch export without committing.

## Non-Goals
- No edits to `docs/docs-catalog.json`.
- No edits to `docs/docs-freshness-registry.json`.
- No edits to `tasks/index.json`.
- No edits to `docs/TASKS.md`.
- No source code, package file, or validation script changes.
- No Linear or GitHub mutation, PR launch, issue transition, or review lifecycle work.
- No full repo validation from this child lane.
- No freshness gate weakening, terminal-owner bypass, cohort deletion, or blind date bump.

## Stakeholders
- Product: CO operators who need truthful docs freshness owner routing.
- Engineering: parent CO-423 implementation lane and docs freshness maintainers.
- Review: provider-worker reviewers validating that the owner truth is current, not historical.

## Metrics & Guardrails
- Primary Success Metrics:
  - all six scoped CO-423 packet/mirror files exist
  - protected terms appear across the packet
  - `CO-420` is framed as historical-only context
  - parent-owned surfaces and validation responsibilities are explicit
- Guardrails / Error Budgets:
  - zero edits outside declared file scope
  - zero Linear/GitHub mutations
  - zero full-suite validation runs from this child lane
  - zero language weakening docs freshness policy

## Technical Considerations
- Architectural Notes:
  - CO-423 is a docs freshness owner-truth lane, not a source-code or validation-script lane.
  - Parent owns any live rerun of `npm run docs:freshness:maintain -- --format json` and any owner metadata repair in `docs/docs-catalog.json`.
  - Current owner evidence must be preserved as terminal `CO-409`, while `CO-420` remains historical-only lineage for the declared March 28 cohort marker.
- Dependencies / Integrations:
  - `npm run docs:freshness`
  - `npm run docs:freshness:maintain`
  - `docs/docs-catalog.json`
  - `docs/docs-freshness-registry.json`
  - parent-owned Linear issue/workpad/PR lifecycle

## Fallback / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? `No` for this child docs packet.
- Rationale: this packet documents a stale terminal-owner condition and parent-owned repair path, but it does not add, retain, or modify fallback/seam behavior. Parent implementation must preserve the existing fail-closed owner verification behavior.

## Open Questions
- Parent-owned implementation will confirm the live CO-423 issue state and the exact post-fix `docs:freshness:maintain` decision before PR handoff.

## Approvals
- Product: parent CO-423 lane, pending
- Engineering: parent docs-review / implementation review, pending
- Design: N/A
