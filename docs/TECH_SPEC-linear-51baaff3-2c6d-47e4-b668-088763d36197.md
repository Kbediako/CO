---
id: 20260409-linear-51baaff3-2c6d-47e4-b668-088763d36197
title: CO: Add optional distributed worker-host parity with SSH routing, capacity, and worker_host observability
relates_to: docs/PRD-linear-51baaff3-2c6d-47e4-b668-088763d36197.md
risk: high
owners:
  - Codex
last_review: 2026-04-09
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-51baaff3-2c6d-47e4-b668-088763d36197.md`
- PRD: `docs/PRD-linear-51baaff3-2c6d-47e4-b668-088763d36197.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-51baaff3-2c6d-47e4-b668-088763d36197.md`
- Task checklist: `tasks/tasks-linear-51baaff3-2c6d-47e4-b668-088763d36197.md`

## Traceability
- Linear issue: `CO-90` / `51baaff3-2c6d-47e4-b668-088763d36197`
- Linear URL: https://linear.app/asabeko/issue/CO-90/co-add-optional-distributed-worker-host-parity-with-ssh-routing
- Follow-up to: `CO-78` / `bea56fb8-c601-4554-8ece-0a63c5fd34bc`

## Summary
- Objective: add one bounded optional distributed worker-host path for provider-worker execution with explicit SSH host inventory, per-host capacity selection, and truthful `worker_host` observability.
- Scope:
  - extend effective `provider-linear-worker` workflow config with optional worker-host inventory and capacity metadata
  - select eligible remote hosts from the control host with explicit per-host load tracking and retry stickiness
  - route launches through the existing control-host provider launcher seam using SSH-backed execution
  - thread `worker_host` into persisted proof, read-model, and operator surfaces
  - add focused tests for selection, launch routing, and observability
- Constraints:
  - keep the single-host default unchanged and well documented
  - keep the feature optional and bounded to provider-worker execution
  - do not absorb `CO-82`, `CO-83`, or `CO-88`

## Implementation Boundary
- Config contract:
  - add additive worker-host metadata under `provider-linear-worker`
  - inventory entries need a stable host identifier, `ssh_destination`, optional `ssh_options`, optional per-host concurrency override, and optional `node_path`
  - this lane assumes the remote worker host can see the same absolute repo, workspace, `.runs`, and `out` paths as the control host; it does not add remote checkout sync or per-host path remapping
- Scheduling:
  - keep existing global or per-state gating
  - layer per-host capacity selection on top for configured remote candidates
  - preserve prior-host preference for truthful retries when possible
  - fail closed when all configured hosts are full
- Launch path:
  - keep the control host authoritative
  - build remote launch specs in `controlHostCliShell` or adjacent control-host seams
  - use bounded SSH execution instead of moving scheduling into the worker runner
- Observability:
  - persist chosen `worker_host` in provider proof and intake state
  - project `worker_host` into read-model and operator surfaces where relevant

## Design
- Worker-host descriptor:
  - `name` or stable identifier used as `worker_host`
  - `ssh_destination`
  - optional `ssh_options`
  - optional `max_concurrent_agents`
  - optional `node_path` when the remote host needs a non-default Node binary
- Host selection:
  - compute current host load from active provider claims or proofs
  - prefer the prior host for retries when that preserves truthful ownership
  - otherwise choose the least-loaded eligible host under explicit capacity
- Remote execution:
  - construct the existing provider-worker command in the remote checkout
  - run it through SSH from the control host with bounded environment propagation
  - assume the remote host can execute against the same absolute checkout and artifact paths already persisted by the control host
  - keep local proof or log materialization truthful even when execution happens remotely
- Read model:
  - enrich provider workflow payloads and issue observability with worker-host metadata
  - present `worker_host` instead of local hostname when the run is remote

## Validation
- audited `linear child-stream --pipeline docs-review`
- focused tests for:
  - worker-host config parsing
  - per-host capacity selection and retry stickiness
  - SSH launch or resume spec construction
  - `worker_host` propagation into observability surfaces
- full repo validation floor before review handoff
