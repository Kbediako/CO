---
id: 20260430-linear-6df648e0-4a48-45a2-bdd3-aeaa9c1deb2b
title: "CO-444 re-home docs:freshness:maintain owner after terminal CO-441"
relates_to: docs/PRD-linear-6df648e0-4a48-45a2-bdd3-aeaa9c1deb2b.md
last_review: 2026-04-30
owners:
  - Codex
---

# TECH_SPEC - CO-444 re-home docs:freshness:maintain owner after terminal CO-441

This mirror points to the canonical task spec at `tasks/specs/linear-6df648e0-4a48-45a2-bdd3-aeaa9c1deb2b.md`.

## Scope
- Create and register the CO-444 docs-first packet for the recurring `docs:freshness:maintain` owner re-home after terminal configured owner `CO-441`.
- Re-home rolling freshness owner metadata in `docs/docs-catalog.json` to live same-project `CO-444`.
- Update `docs/guides/docs-freshness-cohorts.md` so `CO-441` is terminal historical evidence and `CO-444` is the current live owner for `co-420-apr-28-march-28-task-packet-mirror`.
- Register `linear-6df648e0-4a48-45a2-bdd3-aeaa9c1deb2b` in `tasks/index.json` with helper marker `codex-orchestrator:canonical-owner-key=docs:freshness:maintain` while preserving protected token `canonical_owner_key=docs:freshness:maintain`.

## Non-Goals
- No freshness policy weakening, classifier changes, stale-doc deletion, historical evidence deletion, source edits, package edits, validation script edits, or CO-443 provider-intake behavior changes.
- No `last_review` refresh, hiding, archiving, or reclassification for the retained March 28 rolling cohort.
- No broad registry rewrite unrelated to the `docs:freshness:maintain` owner/cohort state.

## Validation Contract
- `docs:freshness:maintain -- --format json` must report `pass_with_owned_rolling_debt` with `owner_issue=CO-444`, verified usable owner metadata, `blocking_changed_paths=[]`, and `policy_capacity_status.status=within_policy`.
- `docs:freshness` must keep the retained March 28 rolling rows visible under the live owner instead of hiding or deleting them.
- Repo validation must pass through delegation guard, spec guard, build, lint, test, docs:check, docs:freshness, docs:freshness:maintain, repo stewardship, `git diff --check`, diff budget, standalone review, and explicit elegance review before handoff.
