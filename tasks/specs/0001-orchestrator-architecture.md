---
id: 20251016-arch
title: Codex-Orchestrator Architecture & MCP Integration
relates_to: tasks/0001-prd-codex-orchestrator.md
risk: medium
owners:
  - Orchestrator Engineering
last_review: 2025-10-16
---

## Added by Orchestrator 2025-10-16

## Summary
- Objective: Define the manager/peer agent topology, MCP wiring, and artifact persistence patterns required to implement Codex-Orchestrator safely.
- Constraints: Must honor SOP guardrails (one-subtask rule, approvals), operate with Codex CLI/IDE/Cloud parity, and remain modular for future adapters without breaking existing flows.

## Proposed Changes
- Architecture / design adjustments: Manager agent coordinates planner, builder, tester, reviewer agents via Agents SDK channels; persistence module records run context under `.runs` with structured metadata; lock service prevents parallel write conflicts; spec guard integrates into CI pipeline.
- Data model updates: Introduce run manifest schema (JSON) capturing task id, approvals, artifacts; learning library index referencing codemods, linters, templates with semantic versioning.
- External dependencies: Codex MCP server (`codex mcp-server`) for deterministic edits; optional Codex Cloud API for parallel goal orchestration; jscodeshift for codemods; eslint for custom linter rules.

## Impact Assessment
- User impact: Provides predictable automation, reduces manual oversight, and centralizes approvals/logging for compliance.
- Operational risk: Medium—parallel runs can contend for shared artifacts; mitigated via lock files and sandbox isolation.
- Security / privacy: Requires strict credential scoping for MCP/Cloud integrations and logging redaction of secrets; no PII stored in repo artifacts.

## Rollout Plan
- Prerequisites: Approved PRD and task list; alignment with security guardrails; baseline repo scaffolding in place.
- Testing strategy: Unit tests for agent orchestration, integration tests simulating MCP runs, smoke tests for Codex Cloud delegation.
- Launch steps: Finalize technical spec, implement manager/peer agents incrementally, enable spec guard, pilot on sample repositories before broader rollout.

## Open Questions
- Best approach to sync `.runs` metadata with Codex Cloud run history?
- How to abstract credential management for multi-environment MCP sessions?

## Approvals
- Reviewer: ____________________
- Date: ____________________
