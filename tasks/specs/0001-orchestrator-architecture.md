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
- Synchronization strategy: Emit `RunCompleted` events from the manager that trigger a `cloud-sync` worker to mirror `.runs/<timestamp>/manifest.json` into Codex Cloud via the Runs API; maintain idempotency with `run_id` hashes stored locally.

## Review Decisions 2025-10-16
- **Run metadata sync:** After each task phase, the manager hands run manifests to a lightweight `cloud-sync` worker that pushes summaries to Codex Cloud using service account credentials; sync retries are capped and logged under `/out/audit.log`.
- **Credential abstraction:** All MCP and Cloud secrets are injected from Vault (`secret/codex/orchestrator/<env>`) at launch; agents read from an in-memory credential broker so no token touches disk.
- **Execution mode default:** Tasks run in MCP mode unless task metadata carries `execution.parallel=true`; manager records the chosen mode in the manifest for post-run analytics.

## Impact Assessment
- User impact: Provides predictable automation, reduces manual oversight, and centralizes approvals/logging for compliance.
- Operational risk: Medium—parallel runs can contend for shared artifacts; mitigated via lock files and sandbox isolation.
- Security / privacy: Requires strict credential scoping for MCP/Cloud integrations and logging redaction of secrets; no PII stored in repo artifacts.

## Rollout Plan
- Prerequisites: Approved PRD and task list; alignment with security guardrails; baseline repo scaffolding in place.
- Testing strategy: Unit tests for agent orchestration, integration tests simulating MCP runs, smoke tests for Codex Cloud delegation.
- Launch steps: Finalize technical spec, implement manager/peer agents incrementally, enable spec guard, pilot on sample repositories before broader rollout.

## Resolved Questions
- **How do we sync `.runs` metadata with Codex Cloud run history?** Approved `cloud-sync` worker approach (see Review Decisions) using manifest hashes for deduplication.
- **How do we abstract credential management for multi-environment MCP sessions?** Vault-backed broker pattern keeps secrets ephemeral and environment-scoped.

## Approvals
- Reviewer: Architecture Steward (Codex)
- Date: 2025-10-16
