---
id: 20260426-linear-1856398b-7746-4d07-af6b-4ad207ffe2b9
title: "CO: make docs hygiene enforce a multi-surface Codex posture matrix"
relates_to: docs/PRD-linear-1856398b-7746-4d07-af6b-4ad207ffe2b9.md
risk: high
owners:
  - Codex
last_review: 2026-04-26
---

# TECH_SPEC - CO-387 multi-surface Codex posture matrix

This mirror points to the canonical task spec at `tasks/specs/linear-1856398b-7746-4d07-af6b-4ad207ffe2b9.md`.

## Implementation Summary
- Introduce a machine-readable Codex posture matrix or equivalent canonical data source for active CLI/model/runtime posture, audited candidates, workflow pins, pack-smoke prerequisites, and historical evidence status.
- Extend docs hygiene so README, docs/book or current navigation, public posture, downstream setup docs, version policy, workflow pins, and pack-smoke expectations validate against that source.
- Add focused tests that fail when stale active release evidence residue, including a `0.124` book-style case, remains current-facing without historical/archive status.
- Preserve useful historical evidence through archive/demotion/status metadata instead of deletion.
- Do not move runtime targets or workflow pins as part of this issue unless a separate evidence-backed parent decision explicitly widens scope.

## Parent-Owned Implementation Surfaces
- `docs/codex-posture-matrix.json` or equivalent structured policy source chosen by the parent lane.
- `docs/docs-catalog.json`
- `scripts/lib/docs-catalog.js`
- `scripts/docs-hygiene.ts`
- `README.md`
- `docs/README.md`
- any concrete docs/book index or generated navigation source present in the parent lane.
- `docs/public/downstream-setup.md`
- `docs/guides/codex-version-policy.md`
- `.github/workflows/core-lane.yml`
- `.github/workflows/release.yml`
- `.github/workflows/pack-smoke-backstop.yml`
- `.github/workflows/cloud-canary.yml`
- `scripts/pack-smoke.mjs`
- `tests/docs-hygiene.spec.ts`
- `tests/pack-smoke.spec.ts`

## Validation Contract
- Child lane:
  - docs-first packet and `tasks/index.json` entry only
  - JSON parse check for `tasks/index.json`
  - no Linear/GitHub/tool-search/web/PR work
  - no full repo validation suites
- Parent lane:
  - docs-review before implementation
  - focused docs-hygiene and pack-smoke tests for the new matrix contract
  - `npm run docs:check` and `npm run docs:freshness` after implementation
  - preserve or demote historical evidence rather than deleting it
