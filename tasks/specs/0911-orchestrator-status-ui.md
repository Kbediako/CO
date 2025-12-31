---
id: 20251223-status-ui
title: Orchestrator Status UI
relates_to: tasks/0911-prd-orchestrator-status-ui.md
risk: medium
owners:
  - Codex (top-level agent)
  - Review agent
last_review: 2025-12-23
---

## Added by Bootstrap 2025-10-16

## Summary
- Objective: Define a minimal, read-only status UI that summarizes orchestrator runs and codebase health for humans.
- Constraints: No new backend or schema changes, read-only access only, dark theme, local artifacts only.

## Proposed Changes
- Architecture / design adjustments:
  - Add a lightweight aggregation step that reads `.runs/`, `out/`, and git metadata to produce a UI-ready JSON payload.
  - Provide a static UI that renders the payload with polling refresh and no write actions.
- Data model updates:
  - Introduce a UI data schema for task buckets, run details, codebase status, and activity events.
- External dependencies:
  - None required; optional local static server for development.

## Impact Assessment
- User impact:
  - Faster understanding of active, ongoing, complete, and pending tasks plus codebase changes.
- Operational risk:
  - Low to medium; file system scanning can be heavy unless capped and cached.
- Security / privacy:
  - Read-only access; avoid loading full logs by default and rely on existing redaction in manifests.

## Rollout Plan
- Prerequisites:
  - PRD approval and docs-review manifest captured.
  - Status classification rules agreed.
- Testing strategy:
  - Unit tests for aggregation logic once implemented.
  - Manual validation against a sample `.runs/` directory.
- Launch steps:
  - Release as a local, opt-in dashboard with a short usage guide.

## Open Questions
- Should blocked or stalled tasks become a dedicated bucket or a badge?
- Which git signals should appear by default for non-engineering stakeholders?

## Approvals
- Reviewer: docs-review
- Date: 2025-12-23
