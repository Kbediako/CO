# **Technical Spec — Derived Snapshot**

> **Source of truth:** tasks/specs/tech-spec-0001-codex-orchestrator.md
>
> This snapshot highlights key points from the canonical spec. Append dated updates when approvals change or revisions land.

## Added by Orchestrator 2025-10-16

- **Scope:** Agents SDK manager with planner/builder/tester/reviewer peers; dual execution modes via Codex MCP and Codex Cloud.
- **Data & Persistence:** Task state manifests under `/out/`, run artifacts in `.runs/`, advisory lock files to prevent parallel collisions.
- **Learning Library:** Codemods, linters, templates tracked in `patterns/` with versioned index; adapters + evaluation harness ensure portability.
- **Security:** Safe approval defaults, spec guard enforcement, secret isolation guidance documented in `AGENTS.md`.
- **Approvals:** Pending sign-off from Engineering, Security, and DX reviewers as of 2025-10-16.
