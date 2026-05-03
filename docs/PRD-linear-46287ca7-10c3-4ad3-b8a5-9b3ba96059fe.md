# PRD - CO-498 repo-wide spec-guard and docs freshness baseline debt

## Traceability
- Linear issue: `CO-498` / `46287ca7-10c3-4ad3-b8a5-9b3ba96059fe`
- Linear URL: https://linear.app/asabeko/issue/CO-498
- Task id: `linear-46287ca7-10c3-4ad3-b8a5-9b3ba96059fe`
- Child task id: `linear-46287ca7-10c3-4ad3-b8a5-9b3ba96059fe-packet-docs`
- Canonical registry id: `20260503-linear-46287ca7-10c3-4ad3-b8a5-9b3ba96059fe`
- Canonical spec: `tasks/specs/linear-46287ca7-10c3-4ad3-b8a5-9b3ba96059fe.md`
- Child docs-packet manifest: `.runs/linear-46287ca7-10c3-4ad3-b8a5-9b3ba96059fe-packet-docs/cli/2026-05-03T01-54-51-764Z-26d030bc/manifest.json`
- Source anchor: `ctx:sha256:6bafd5badaa50cbba4e2a69b638852a8b77f7957ee3e5e28daf5c2ddc84ef7a7#chunk:c000001`
- Source object id: `sha256:6bafd5badaa50cbba4e2a69b638852a8b77f7957ee3e5e28daf5c2ddc84ef7a7`
- Source payload path: `.runs/linear-46287ca7-10c3-4ad3-b8a5-9b3ba96059fe-packet-docs/cli/2026-05-03T01-54-51-764Z-26d030bc/memory/source-0/source.txt`

## Summary
- Problem Statement: provider-worker lanes keep encountering repo-wide `spec-guard` and `docs:freshness` baseline debt that is not necessarily caused by the active implementation diff. CO-498 needs a docs-first packet that preserves the validator boundaries, names the protected baseline-debt surfaces, and prevents the parent lane from broadening into unrelated provider child-lane behavior.
- Desired Outcome: create the CO-498 docs-first packet and task mirrors so the parent lane can prove whether failures reproduce on a clean origin/main baseline, classify `task specs`, `last_review`, and `rolling freshness cohort` debt accurately, and route any repo-wide blocker without weakening `spec-guard` or `docs:freshness`.

## User Request Translation
- User intent / needs: produce only the CO-498 docs packet, with exact issue-shaping language for repo-wide baseline debt and clear parent-owned follow-on work.
- Success criteria / acceptance:
  - PRD, canonical TECH_SPEC, TECH_SPEC mirror, ACTION_PLAN, task checklist, and `.agent` mirror exist for `linear-46287ca7-10c3-4ad3-b8a5-9b3ba96059fe`.
  - The packet preserves protected terms: `docs:freshness`, `spec-guard`, `last_review`, `rolling freshness cohort`, `CO-444`, `task specs`, and clean origin/main baseline.
  - The packet explicitly rejects provider child-lane behavior changes, validator weakening, historical packet deletion, and blind `last_review` bumps.
  - The packet separates child-lane docs output from parent-owned registry, catalog, task-index, Linear, GitHub, PR, workpad, and validation lifecycle work.
- Constraints / non-goals:
  - this child lane edits only the six declared docs packet and task mirror files
  - no edits to `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`, `docs/docs-catalog.json`, scripts, tests, source, or task specs outside this issue packet
  - no Linear, GitHub, PR, lifecycle, or workpad helper calls
  - no full repo validation suites from this child lane

## Intent Checksum
- Exact user wording / phrases to preserve:
  - `docs:freshness`
  - `spec-guard`
  - `last_review`
  - `rolling freshness cohort`
  - `CO-444`
  - `task specs`
  - clean origin/main baseline
  - repo-wide spec-guard/docs-freshness baseline debt
- Protected artifact and surface names:
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run docs:freshness`
  - `npm run docs:freshness:maintain -- --format json`
  - `tasks/specs/**`
  - `docs/docs-freshness-registry.json`
  - `docs/docs-catalog.json`
  - `tasks/index.json`
  - `docs/TASKS.md`
- Nearby wrong interpretations to reject:
  - change provider child-lane behavior to absorb repo-wide freshness or spec debt
  - weaken `spec-guard`, `docs:freshness`, or `docs:freshness:maintain`
  - delete historical packet evidence to make the gate green
  - perform blind last_review bumps without review/source-state evidence
  - treat clean `origin/main` failures as active-diff regressions without proof
  - fold CO-444 rolling freshness cohort ownership into unrelated implementation lanes

## Parity / Alignment Matrix

| Surface | Current Truth | Reference Truth | Target Truth | Explicitly Out Of Scope |
| --- | --- | --- | --- | --- |
| `spec-guard` / `task specs` | Active lanes may fail because stale `task specs` or `last_review` debt already exists in the repo. | `spec-guard` stays strict and classifies stale active specs instead of hiding them. | Parent proves whether the reduced failure reproduces on a clean origin/main baseline before assigning ownership. | Weakening `spec-guard`, disabling stale-spec checks, or changing guard semantics from this packet. |
| `docs:freshness` | Freshness gates may fail on repo-wide docs registry/catalog debt rather than the active diff. | `docs:freshness` stays authoritative for registry coverage and stale-doc detection. | Parent runs the freshness checks and classifies lane-owned paths versus baseline debt. | Deleting historical packets, bypassing docs freshness, or editing registry/catalog in this child lane. |
| `docs:freshness:maintain` / `rolling freshness cohort` | CO-444 can be the live or canonical owner for a rolling freshness cohort, with machine-readable ownership evidence needed before rerouting. | Owner truth is preserved through `docs:freshness:maintain -- --format json`, including `blocking_changed_paths=[]` when relevant. | Parent preserves CO-444 cohort evidence and routes follow-up ownership without collapsing it into unrelated implementation work. | Re-homing cohort metadata from this child lane or flattening owner evidence into a vague note. |
| `last_review` | Old dates can be a symptom, but not all stale dates should be bumped blindly. | `last_review` reflects real review or verified terminal reclassification. | Parent updates `last_review` only after review/source-state evidence, and reclassifies terminal specs when live state proves they are done. | Blind date bumps or changing source issue state from this child lane. |
| Clean origin/main baseline | Current branch failures may be inherited baseline debt. | Baseline repro distinguishes active-diff regressions from repo-wide debt. | Parent captures clean `origin/main` proof before blocking, routing, or widening. | Treating current-head failures as local regressions without baseline evidence. |
| Child packet ownership | CO-498 packet files were absent at lane start. | Same-issue child lanes produce bounded patch artifacts only. | This child lane creates the six declared packet/mirror files for parent patch import. | `tasks/index.json`, `docs/TASKS.md`, Linear, GitHub, workpad, PR lifecycle, source edits, or full validation. |

## Not Done If
- Any protected term is omitted or renamed.
- The packet suggests provider child-lane behavior changes as the repair.
- The packet weakens `spec-guard`, `docs:freshness`, or `docs:freshness:maintain`.
- The packet deletes historical packet evidence or encourages historical packet deletion.
- The packet allows blind last_review bumps without review or source-state evidence.
- The packet fails to require clean origin/main baseline proof before classifying repo-wide debt.
- The packet collapses CO-444 rolling freshness cohort ownership into unrelated implementation work.
- The child lane edits outside the six declared docs/task files or runs full repo validation suites.

## Goals
- Create the CO-498 docs-first packet and task mirror docs.
- Preserve validator strictness and exact protected terms.
- Define the parent-owned baseline classification workflow for `spec-guard`, `docs:freshness`, and `docs:freshness:maintain`.
- Keep repo-wide baseline debt separate from unrelated provider child-lane behavior.
- Leave changes in place for parent patch export without committing.

## Non-Goals
- No provider child-lane behavior changes.
- No validator weakening for `spec-guard`, `docs:freshness`, or `docs:freshness:maintain`.
- No historical packet deletion.
- No blind last_review bumps.
- No edits to `docs/docs-freshness-registry.json`, `docs/docs-catalog.json`, `tasks/index.json`, or `docs/TASKS.md` from this child lane.
- No source, script, test, package, Linear, GitHub, workpad, PR, or lifecycle changes from this child lane.

## Stakeholders
- Product: CO operators who need truthful handoff and blocker routing.
- Engineering: parent CO-498 implementation lane, docs freshness maintainers, and spec-guard owners.
- Design: N/A.

## Metrics & Guardrails
- Primary Success Metrics:
  - all six scoped CO-498 packet/mirror files exist
  - protected terms appear across the packet
  - wrong interpretations are explicitly rejected
  - parent-owned baseline proof and routing steps are visible
- Guardrails / Error Budgets:
  - zero edits outside declared child-lane file scope
  - zero Linear/GitHub/workpad/PR mutations
  - zero full repo validation runs from the child lane
  - zero language that weakens validators or erases historical evidence

## Technical Considerations
- Architectural Notes:
  - CO-498 is a docs/validation blocker-classification lane, not an implementation lane for provider child-lane behavior.
  - Parent owns live validation, clean `origin/main` repro, owner-truth classification, registry/catalog updates, and final state transitions.
  - `docs:freshness`, `docs:freshness:maintain`, and `spec-guard` can fail independently; the packet must keep those gates separate.
- Dependencies / Integrations:
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run docs:freshness`
  - `npm run docs:freshness:maintain -- --format json`
  - `tasks/specs/**`
  - `docs/docs-freshness-registry.json`
  - `docs/docs-catalog.json`
  - parent-owned Linear issue/workpad/PR lifecycle

## Fallback / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? `Yes`, because CO-498 concerns stale/baseline debt and validator routing. This child packet does not add or retain a code fallback.
- Decision: justify retaining the strict validator behavior unchanged.
- Rationale: the correct repair path is evidence-backed classification, reclassification, owner routing, or blocking on repo-wide debt. The validators must continue to fail closed until the right owner fixes the right debt.

## Open Questions
- Parent-owned investigation will identify the exact stale `task specs`, `last_review` rows, `docs:freshness` rows, and `rolling freshness cohort` owner evidence that currently block the lane.

## Approvals
- Product: parent CO-498 lane, pending
- Engineering: parent docs-review / implementation review, pending
- Design: N/A
