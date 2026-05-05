# PRD - CO-444 re-home docs:freshness:maintain owner after terminal CO-441

## Traceability
- Linear issue: `CO-444` / `6df648e0-4a48-45a2-bdd3-aeaa9c1deb2b`
- Linear URL: https://linear.app/asabeko/issue/CO-444
- Task id: `linear-6df648e0-4a48-45a2-bdd3-aeaa9c1deb2b`
- Canonical spec: `tasks/specs/linear-6df648e0-4a48-45a2-bdd3-aeaa9c1deb2b.md`
- Canonical registry id: `20260430-linear-6df648e0-4a48-45a2-bdd3-aeaa9c1deb2b`
- Canonical owner key: `docs:freshness:maintain`
- Canonical owner marker: `codex-orchestrator:canonical-owner-key=docs:freshness:maintain`
- Protected owner-key token: `canonical_owner_key=docs:freshness:maintain`
- Source anchor: `ctx:sha256:5e1fb213d42ae2c9050c3d396ee5c10556ac3d54403ab9ead6f695377a94207c#chunk:c000001`
- Source manifest: `.runs/linear-6df648e0-4a48-45a2-bdd3-aeaa9c1deb2b-docs-packet/cli/2026-04-30T07-35-51-905Z-15903f69/manifest.json`
- Source payload note: the referenced `.runs/.../memory/source-0/source.txt` path was not present in this child-lane checkout, so this packet is anchored on the bounded child-lane prompt.

## Summary
- Problem Statement: `docs:freshness:maintain` had another terminal configured owner handoff: the configured owner was terminal `CO-441`, so the retained March 28 task-packet mirror rolling cohort needed a live same-project owner without weakening freshness policy or hiding historical evidence.
- Desired Outcome: create and register the CO-444 docs-first packet, re-home the live owner metadata to `CO-444`, preserve `canonical_owner_key=docs:freshness:maintain`, `block_unowned_repo_debt`, and the retained `co-420-apr-28-march-28-task-packet-mirror` evidence, then prove `docs:freshness:maintain` passes with owned rolling debt.

## User Request Translation
- User intent / needs:
  - create the CO-444 docs-first packet and registry mirrors
  - preserve exact owner-truth terms: `docs:freshness:maintain`, `canonical_owner_key=docs:freshness:maintain`, `terminal configured owner CO-441`, and `block_unowned_repo_debt`
  - preserve the retained `co-420-apr-28-march-28-task-packet-mirror` March 28 task-packet mirror rolling cohort
  - update `docs/docs-catalog.json` and `docs/guides/docs-freshness-cohorts.md` so `CO-441` is terminal historical evidence and `CO-444` is the live same-project owner
  - keep `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` synchronized for the packet and owner repair
- Success criteria / acceptance:
  - CO-444 packet files and mirrors exist in the declared file scope
  - `tasks/index.json` registers `20260430-linear-6df648e0-4a48-45a2-bdd3-aeaa9c1deb2b`
  - `docs/TASKS.md` records the owner re-home and validation snapshot
  - `docs/docs-freshness-registry.json` covers the six new packet/mirror docs with `last_review=2026-04-30`
  - `docs/docs-catalog.json` points rolling freshness owner metadata at `CO-444`
  - `docs/guides/docs-freshness-cohorts.md` records `CO-441` as terminal historical evidence and `CO-444` as current owner
  - `docs:freshness:maintain` reports `pass_with_owned_rolling_debt` with `owner_issue=CO-444`
  - acceptance criteria, non-goals, Not Done If conditions, and validation plan are visible in packet and checklist surfaces
- Constraints / non-goals:
  - do not delete stale registry rows or historical cohort evidence to make validation pass
  - do not weaken `docs:freshness` or `docs:freshness:maintain`
  - do not widen CO-443 or another product-scope implementation lane into recurring docs-freshness maintenance
  - do not change source code, validation scripts, package files, or freshness policy knobs

## Intent Checksum
- Exact user wording / phrases to preserve:
  - `docs:freshness:maintain`
  - `canonical_owner_key=docs:freshness:maintain`
  - `co-420-apr-28-march-28-task-packet-mirror`
  - `terminal configured owner CO-441`
  - `block_unowned_repo_debt`
  - `March 28 task-packet mirror rolling cohort`
  - `docs/docs-catalog.json`
  - `docs/guides/docs-freshness-cohorts.md`
  - `tasks/index.json`
  - `docs/TASKS.md`
  - `docs/docs-freshness-registry.json`
- Protected terms / exact artifact and surface names:
  - `.agent/task/linear-6df648e0-4a48-45a2-bdd3-aeaa9c1deb2b.md`
  - `docs/PRD-linear-6df648e0-4a48-45a2-bdd3-aeaa9c1deb2b.md`
  - `docs/TECH_SPEC-linear-6df648e0-4a48-45a2-bdd3-aeaa9c1deb2b.md`
  - `docs/ACTION_PLAN-linear-6df648e0-4a48-45a2-bdd3-aeaa9c1deb2b.md`
  - `tasks/specs/linear-6df648e0-4a48-45a2-bdd3-aeaa9c1deb2b.md`
  - `tasks/tasks-linear-6df648e0-4a48-45a2-bdd3-aeaa9c1deb2b.md`
  - `tasks/index.json`
  - `docs/TASKS.md`
  - `docs/docs-freshness-registry.json`
  - parent-owned `docs/docs-catalog.json`
  - parent-owned `docs/guides/docs-freshness-cohorts.md`
- Nearby wrong interpretations to reject:
  - stopping at packet-only registration while terminal `CO-441` remains the configured live owner
  - treating `terminal configured owner CO-441` as a waiver because `blocking_changed_paths=[]`
  - deleting, hiding, archiving, or refreshing historical rows for `co-420-apr-28-march-28-task-packet-mirror`
  - changing docs freshness classifier behavior or weakening `block_unowned_repo_debt`
  - widening CO-443 or another product implementation issue into docs-freshness maintenance

## Parity / Alignment Matrix

| Surface | Current Truth | Reference Truth | Target Truth | Explicitly Out Of Scope |
| --- | --- | --- | --- | --- |
| CO-444 packet | No CO-444 packet existed before the docs-packet lane. | Owner re-home lanes require PRD, TECH_SPEC, ACTION_PLAN, checklist, agent mirror, task index, task snapshot, and docs-freshness registry coverage before handoff. | Packet and mirrors exist for `linear-6df648e0-4a48-45a2-bdd3-aeaa9c1deb2b` with protected terms and Not Done If visible. | Source, package, validation-script, or policy changes. |
| `docs:freshness:maintain` owner truth | `docs:freshness:maintain` reproduced `block_unowned_repo_debt` because configured owner `CO-441` was terminal `Done`. | Terminal configured owners are historical evidence only; owner debt should route to a live same-project owner issue without weakening freshness gates. | Owner metadata is re-homed to live `CO-444`, and `CO-441` remains terminal historical evidence. | Maintenance classifier behavior changes or treating terminal owner evidence as a waiver. |
| March 28 rolling cohort | `co-420-apr-28-march-28-task-packet-mirror` is retained historical rolling debt with 33 rows. | Historical cohort evidence stays visible and machine-readable while owner metadata moves forward. | The cohort remains visible under `CO-444` with no `last_review` refresh, deletion, hiding, archiving, or reclassification. | Refreshing `last_review`, deleting rows, hiding rows, archiving rows, or reclassifying the cohort. |
| Owner files | `docs/docs-catalog.json` and `docs/guides/docs-freshness-cohorts.md` carry the live owner truth and cohort lineage. | Live owner repair should only move owner metadata and guide lineage. | Catalog owner is `CO-444`; guide lineage names `CO-441` as terminal history and `CO-444` as current owner. | Broad registry rewrites or CO-443 implementation behavior changes. |

## Not Done If
- CO-444 packet or mirrors omit `docs:freshness:maintain`, `canonical_owner_key=docs:freshness:maintain`, `terminal configured owner CO-441`, `block_unowned_repo_debt`, `co-420-apr-28-march-28-task-packet-mirror`, or `March 28 task-packet mirror rolling cohort`.
- The packet implies `terminal configured owner CO-441` is harmless, ignorable, or waived.
- The live owner path still resolves only to terminal `CO-441`.
- `docs:freshness:maintain` still reports `block_unowned_repo_debt` for `canonical_owner_key=docs:freshness:maintain`.
- Source code, validation scripts, package files, freshness policy knobs, or CO-443 behavior are changed to clear this gate.
- Historical cohort evidence is deleted, hidden, blindly refreshed, archived, or reclassified to make validation pass.
- `docs:freshness` or `docs:freshness:maintain` behavior is weakened.
- `tasks/index.json`, `docs/TASKS.md`, or `docs/docs-freshness-registry.json` omit the CO-444 registration.

## Goals
- Create and register the CO-444 docs-first packet.
- Re-home rolling freshness owner metadata to live same-project `CO-444`.
- Record terminal `CO-441` as historical owner evidence in the cohort guide.
- Keep protected owner terms and Not Done If conditions visible across packet/checklist surfaces.
- Preserve historical rolling cohort evidence and parent-owned owner-rehome boundaries.
- Add docs-freshness registry rows for the new packet and mirrors.

## Non-Goals
- No freshness policy, cap, classifier, or validation-script changes.
- No stale registry row deletion or historical cohort evidence removal.
- No CO-443 provider-intake recovery behavior changes.
- No product-scope implementation lane widening.

## Stakeholders
- Product: CO operators relying on truthful queue and docs freshness owner state.
- Engineering: parent CO-444 provider worker and docs freshness maintainers.
- Review: parent lane accepting the child-lane patch artifact.

## Metrics & Guardrails
- Primary Success Metrics:
  - all six packet/mirror files exist
  - `tasks/index.json` contains the CO-444 task item
  - `docs/TASKS.md` contains a CO-444 owner re-home snapshot
  - `docs/docs-freshness-registry.json` contains six active rows for the new docs
  - `docs/docs-catalog.json` sets the rolling owner issue to `CO-444`
  - `docs/guides/docs-freshness-cohorts.md` records the CO-441 to CO-444 owner handoff
  - `docs:freshness:maintain` reports `pass_with_owned_rolling_debt`
  - protected-term scan finds all required owner-truth terms
- Guardrails / Error Budgets:
  - zero source code, script, package, or policy changes
  - zero CO-443 implementation behavior changes
  - zero freshness policy weakening or historical evidence deletion

## Technical Considerations
- Architectural Notes:
  - The docs-packet child lane was packet-only. The parent lane owns live owner repair, validation, PR lifecycle, Linear state, and workpad updates.
  - CO-444 is the next tactical live-owner handoff for canonical owner key `docs:freshness:maintain` after terminal configured owner `CO-441`.
  - `block_unowned_repo_debt` remains the expected fail-closed owner-truth classifier until a live owner is repaired.
- Dependencies / Integrations:
  - `docs:freshness:maintain`
  - `docs/docs-freshness-registry.json`
  - `tasks/index.json`
  - `docs/TASKS.md`
  - parent-owned `docs/docs-catalog.json`
  - parent-owned `docs/guides/docs-freshness-cohorts.md`

## Fallback / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? Yes.
- Decision: this child lane does not add or extend fallback behavior. It records packet evidence for a parent-owned tactical live-owner re-home of existing rolling freshness cohort ownership.
- Rationale: the current work is traceability and registry setup only; the parent lane must preserve `docs:freshness:maintain` fail-closed behavior and keep the retained rolling freshness cohort visible.

## CO-382 Fallback Decision Table

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `docs:freshness:maintain` | Completed-lane historical packet/spec freshness hold | `expire fallback` | CO-444 | Terminal Linear source issues left task-packet/spec metadata active past cadence | 2026-05-05 | 2026-05-05 | 2026-05-12 | Archive packet mirrors and reclassify specs under a live owner; otherwise block handoff | `docs:freshness:maintain -- --format json` |

- Large refactor decision: bounded metadata cleanup under the existing `docs:freshness:maintain` owner; no runtime or policy authority split is added.
- Minor seam decision: bounded temporary freshness-hold cleanup is acceptable; unresolved rows must be archived, reclassified, or blocked by 2026-05-12.

## Open Questions
- None.

## Approvals
- Product: CO-444 child-lane prompt, accepted as packet contract
- Engineering: bounded docs-packet child lane
- Design: N/A
