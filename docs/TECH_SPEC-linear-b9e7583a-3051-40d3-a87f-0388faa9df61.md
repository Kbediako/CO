---
id: 20260430-linear-b9e7583a-3051-40d3-a87f-0388faa9df61
title: "CO-441 re-home live docs freshness maintenance owner after terminal CO-427"
relates_to: docs/PRD-linear-b9e7583a-3051-40d3-a87f-0388faa9df61.md
risk: high
owners:
  - Codex
last_review: 2026-04-30
---

# TECH_SPEC - CO-441 re-home live docs freshness maintenance owner after terminal CO-427

This mirror points to the canonical task spec at `tasks/specs/linear-b9e7583a-3051-40d3-a87f-0388faa9df61.md`.

## Implementation Summary
- Create the CO-441 packet and mirrors for the recurring `docs:freshness:maintain` owner re-home after terminal `CO-427`.
- Register `linear-b9e7583a-3051-40d3-a87f-0388faa9df61` in `tasks/index.json` with canonical owner marker `codex-orchestrator:canonical-owner-key=docs:freshness:maintain`.
- Add `docs/TASKS.md` and `docs/docs-freshness-registry.json` coverage for the packet/mirror docs.
- Re-home parent-owned `docs/docs-catalog.json` rolling owner metadata to `CO-441`.
- Update parent-owned `docs/guides/docs-freshness-cohorts.md` so `CO-427` is terminal historical evidence and `CO-441` is current tactical owner.
- Preserve the correct interpretation: CO-441 is a narrow tactical current live-owner hold so CO-330 stays scoped and CO-431 remains the structural/root automation owner.
- Preserve `docs:freshness:maintain`, `rolling freshness cohort`, `CO-427`, `configured_owner_terminal`, and canonical owner key `docs:freshness:maintain`.

## Implementation Boundaries
- The docs-packet child lane edits packet, task, index, task snapshot, and docs-freshness registry surfaces only.
- The parent lane may edit `docs/docs-catalog.json` and `docs/guides/docs-freshness-cohorts.md` only for the CO-441 owner re-home and lineage evidence.
- No CO-330 provider-refresh code or behavior changes.
- No freshness policy weakening, stale-doc deletion, historical evidence deletion, source edits, package edits, validation script edits, Linear mutations, PR lifecycle work, or workpad edits.

## Validation Contract
- Packet setup validation must show:
  - all six packet/mirror files exist
  - `tasks/index.json` parses and contains `20260430-linear-b9e7583a-3051-40d3-a87f-0388faa9df61`
  - `docs/docs-freshness-registry.json` parses and contains six rows for the CO-441 packet/mirror docs
  - `docs/docs-catalog.json` names `CO-441` as the rolling freshness owner
  - `docs/guides/docs-freshness-cohorts.md` preserves terminal `CO-427` evidence and current `CO-441` owner truth
  - `docs:freshness:maintain` returns `pass_with_owned_rolling_debt` with `owner_issue=CO-441`
  - protected terms appear across packet and mirror surfaces
  - child-lane-owned surfaces and parent-owned owner metadata stay within their declared boundaries
