# **Technical Spec — Derived Snapshot**

> **Source of truth:** tasks/specs/tech-spec-0001-codex-orchestrator.md
>
> This snapshot highlights key points from the canonical spec. Append dated updates when approvals change or revisions land.

## Added by Orchestrator 2025-10-16

- **Scope:** Agents SDK manager with planner/builder/tester/reviewer peers; dual execution modes via Codex MCP and Codex Cloud.
- **Data & Persistence:** Task state manifests under `/out/`, run artifacts in `.runs/`, advisory lock files to prevent parallel collisions; run manifests mirrored to Codex Cloud via `cloud-sync` worker using manifest hashes for idempotency.
- **Mode Policy:** Default to MCP mode unless task metadata signals `execution.parallel=true`; selected mode recorded in manifest and guardrail logged.
- **Learning Library:** Codemods, linters, templates tracked in `patterns/` with versioned index; adapters + evaluation harness ensure portability.
- **Security:** Safe approval defaults, spec guard enforcement, Vault-backed credential broker keeps MCP/Cloud tokens ephemeral and memory only.
- **Approvals:** Architecture, Security, and DX reviewers signed off on 2025-10-16.
