# Technical Spec - Codex Cloud Execution Wiring (Task 0957)

## Overview
- Objective: Wire orchestrator cloud mode to real Codex Cloud task execution and preserve CO evidence workflows.
- Scope: Execution routing, cloud lifecycle adapters, manifest schema updates, retries, and validation strategy.
- Canonical TECH_SPEC: `tasks/specs/0957-codex-cloud-execution-wiring.md`.

## Technical Requirements (Summary)
- Cloud-mode dispatch path uses Codex Cloud lifecycle (launch/status/diff/apply) instead of local command-stage execution.
- Cloud metadata is persisted in run manifests and task state with backward compatibility for local mode.
- Retry/error handling is explicit and bounded for transient cloud failures.
- Validation includes unit + integration coverage for cloud path and regression coverage for local mode.
