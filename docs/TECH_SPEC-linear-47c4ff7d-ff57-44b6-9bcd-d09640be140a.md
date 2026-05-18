---
id: 20260422-linear-47c4ff7d-ff57-44b6-9bcd-d09640be140a
title: "Maintain docs freshness rolling baseline for Apr 22 stale cohorts and registry drift"
relates_to: docs/PRD-linear-47c4ff7d-ff57-44b6-9bcd-d09640be140a.md
risk: high
owners:
  - Codex
last_review: 2026-04-22
canonical_owner_marker: codex-orchestrator:canonical-owner-key=docs:freshness:maintain
---

# TECH_SPEC - Maintain docs freshness rolling baseline for Apr 22 stale cohorts and registry drift

This mirror points to the canonical task spec at `tasks/specs/linear-47c4ff7d-ff57-44b6-9bcd-d09640be140a.md`.

## Implementation Summary
- Register `CO-300` as the live canonical owner for `docs:freshness:maintain` because both `CO-175` and `CO-267` are terminal while Apr 22 repo-wide freshness debt is live.
- Treat the earlier `4307`/`4316`/`53`/`6 missing` issue snapshot as historical context only; the live `2026-04-22` current-main baseline is `4390` docs, `4393` registry entries, `16` stale docs, `0` missing-on-disk or invalid registry rows, one hard-stale `docs/codex-orchestrator-issues.md`, and `15` historical candidate entries across `6` candidate cohorts.
- Repair the live Apr 22 blocker shape through reviewed work on hard-stale `docs/codex-orchestrator-issues.md`, Mar 22 historical cohorts including `1317`/`1318`, and terminal-owner metadata reuse.
- Keep `CO-295` provider-linear workflow ownership out of scope and preserve `blocking_changed_paths=[]` as proof the debt is repo-wide, not diff-local.
- Do not weaken `docs:freshness`, `docs:freshness:maintain`, `docs:check`, or `spec-guard`, and do not hide debt with blind `last_review` bumps or deletion-only cleanup.

## Canonical Artifacts
- Before docs freshness report: `out/linear-47c4ff7d-ff57-44b6-9bcd-d09640be140a/before/docs-freshness.json`
- Before maintenance report: `out/linear-47c4ff7d-ff57-44b6-9bcd-d09640be140a/before/docs-freshness-maintenance.json`
- Planned classification artifact: `docs/findings/linear-47c4ff7d-ff57-44b6-9bcd-d09640be140a-docs-freshness-classification.md`
- Worker run manifest: `.runs/linear-47c4ff7d-ff57-44b6-9bcd-d09640be140a/cli/2026-04-22T02-48-35-760Z-e043d741/manifest.json`

## Validation Contract
- Docs packet integrity:
  - protected-term grep over the packet and registry mirrors
  - `git diff --check` over the touched files
  - JSON parse checks for `tasks/index.json` and `docs/docs-freshness-registry.json`
- Parent implementation:
  - `npm run docs:freshness`
  - `npm run docs:freshness:maintain`
  - `npm run docs:check`
  - focused regression coverage so terminal owner issues are not recommended as live canonical owners
  - parent docs-review and implementation review before handoff
