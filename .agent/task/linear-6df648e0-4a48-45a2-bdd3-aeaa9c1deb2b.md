# Agent Task Mirror - linear-6df648e0-4a48-45a2-bdd3-aeaa9c1deb2b

- Linear Issue: `CO-444` / `6df648e0-4a48-45a2-bdd3-aeaa9c1deb2b`
- Title: Re-home docs:freshness:maintain owner after terminal CO-441
- Canonical owner marker: `codex-orchestrator:canonical-owner-key=docs:freshness:maintain`
- Protected owner-key token: `canonical_owner_key=docs:freshness:maintain`
- PRD: `docs/PRD-linear-6df648e0-4a48-45a2-bdd3-aeaa9c1deb2b.md`
- TECH_SPEC: `docs/TECH_SPEC-linear-6df648e0-4a48-45a2-bdd3-aeaa9c1deb2b.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-6df648e0-4a48-45a2-bdd3-aeaa9c1deb2b.md`
- Checklist: `tasks/tasks-linear-6df648e0-4a48-45a2-bdd3-aeaa9c1deb2b.md`

## Current Truth
- CO-444 is the live owner re-home lane for `docs:freshness:maintain` after terminal configured owner `CO-441`.
- The protected owner-truth shape includes `block_unowned_repo_debt` and `terminal configured owner CO-441`.
- The retained cohort is `co-420-apr-28-march-28-task-packet-mirror`, the March 28 task-packet mirror rolling cohort.
- `docs/docs-catalog.json` now points rolling freshness owner metadata at `CO-444`.
- `docs/guides/docs-freshness-cohorts.md` preserves terminal `CO-441` lineage and names `CO-444` as current owner.

## Guardrails
- Do not weaken `docs:freshness` or `docs:freshness:maintain`.
- Do not delete, hide, blindly refresh, archive, or reclassify historical evidence.
- Do not widen CO-443 or another implementation lane into recurring docs-freshness maintenance.
- Do not mutate source code, validation scripts, package files, or freshness policy.

## Not Done If
- Protected terms are missing from the packet or mirrors.
- `terminal configured owner CO-441` or `block_unowned_repo_debt` is described as waived.
- The live owner still resolves only to terminal `CO-441`.
- `docs:freshness:maintain` still reports `block_unowned_repo_debt` for `canonical_owner_key=docs:freshness:maintain`.
- The lane changes freshness policy, validation scripts, source code, package files, or CO-443 behavior.
- Historical evidence is deleted to make validation pass.

## Validation Handoff
- Completed child-lane setup:
  - created PRD, TECH_SPEC mirror, ACTION_PLAN, canonical task spec, task checklist, and agent mirror
  - registered `20260430-linear-6df648e0-4a48-45a2-bdd3-aeaa9c1deb2b` in `tasks/index.json`
  - added CO-444 top snapshot in `docs/TASKS.md`
  - added six active registry rows in `docs/docs-freshness-registry.json`
- Completed parent-owned repair:
  - re-homed live owner metadata to `CO-444`
  - preserved terminal `CO-441` as historical owner evidence
  - proved `docs:freshness:maintain` passes with owned rolling debt
- Remaining handoff work:
  - standalone review, explicit elegance review, PR lifecycle, feedback drain, and Linear review-state handoff

## Evidence
- Source manifest: `.runs/linear-6df648e0-4a48-45a2-bdd3-aeaa9c1deb2b-docs-packet/cli/2026-04-30T07-35-51-905Z-15903f69/manifest.json`
- Source anchor: `ctx:sha256:5e1fb213d42ae2c9050c3d396ee5c10556ac3d54403ab9ead6f695377a94207c#chunk:c000001`
- Source payload note: referenced payload path was absent in this child checkout.
- Maintenance report: `out/linear-6df648e0-4a48-45a2-bdd3-aeaa9c1deb2b/docs-freshness-maintenance.json`
