---
id: 20260424-co-344-doctor-local-optin-advisory
title: CO-344 Doctor Local Opt-In Advisory
status: in_progress
owner: Codex
created: 2026-04-24
last_review: 2026-06-17
review_cadence_days: 30
risk_level: medium
related_prd: docs/PRD-co-344-doctor-local-optin-advisory.md
related_action_plan: docs/ACTION_PLAN-co-344-doctor-local-optin-advisory.md
related_tasks:
  - tasks/tasks-co-344-doctor-local-optin-advisory.md
review_notes:
  - 2026-06-17: CO-579 pre-expiry review kept this spec active-current; no verified terminal/archive evidence was established in this stream, CO-579 is the live non-terminal docs-freshness owner, and docs/spec gates remain unchanged.
  - 2026-04-24: Opened after CO-341 merge when a read-only validator confirmed stale `local_model_opt_in = "gpt-5.5"` markers can still leave overall doctor defaults status `ok`.
  - 2026-05-18: CO-522 active-spec audit found 1 unchecked task checklist item, so this spec remains active and was reviewed for current lifecycle ownership rather than archived. Evidence: `out/linear-b642e879-ba50-45ef-b0d9-b059afa9e932-recovery/spec-preexpiry-local-classification.json`.
---

# Technical Specification

## Context
CO-341 made local `gpt-5.5` posture marker-backed and access-verified. The doctor already emits guidance when the marker is not verified, but the aggregate defaults status did not include that advisory condition when ordinary model defaults were portable.

## Requirements
1. Track unverified local opt-in marker state explicitly.
2. Include it in aggregate `codex_defaults.status`.
3. Add focused coverage for portable defaults plus stale marker.

## Validation
- `npm run test:core -- orchestrator/tests/Doctor.test.ts`
- `git diff --check`
- docs and guard checks before PR handoff.
