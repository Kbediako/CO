# **PRD — Derived Snapshot**

> **Source of truth:** tasks/0001-prd-codex-orchestrator.md
>
> This file is a human-friendly mirror. When the PRD in /tasks changes or remains pending approval, update this snapshot with the latest status.

## Added by Bootstrap 2025-10-16

### How to Use
- Draft the canonical PRD in `/tasks` using `/.ai-dev-tasks/create-prd.md` alongside `.agent/task/templates/prd-template.md`.
- After approvals, reflect key highlights here and link back to the canonical file.
- Keep this snapshot concise; defer detailed decisions to the `/tasks` source of truth.

## Added by Orchestrator 2025-10-16

- **Canonical Source:** `tasks/0001-prd-codex-orchestrator.md`
- **Approval State:** Approved 2025-10-16 — Product (Jordan Lee), Engineering (Priya Desai), and Design (Mateo Alvarez) confirmed in safe approval mode.
- **Focus:** Codex-Orchestrator workflow establishing SOP-aligned planning, guardrails, MCP-based automation, and learning libraries.
- **Highlights:** Goals cover deterministic Codex handoffs, artifact mirroring, and security defaults; success metrics target complete SOP coverage, reusable patterns, and faster bootstraps.
- **Status Update:** Approvals logged in Governance Update 2025-10-16.

## Governance Update 2025-10-16
- Product — Jordan Lee confirmed approval 2025-10-16 21:45 UTC (safe approval mode)
- Engineering — Priya Desai confirmed approval 2025-10-16 22:05 UTC (safe approval mode)
- Design — Mateo Alvarez confirmed approval 2025-10-16 22:20 UTC (safe approval mode)
- Log Reference: tasks/0001-prd-codex-orchestrator.md#approval-log-2025-10-16 (Phase Gate G1) with Codex CLI run ID GOV-0001-PRD-20251016 maintained in session notes.

## Release Notes — 2025-10-16
- Guardrails CI package landed: `scripts/spec-guard.sh` enforces spec freshness and the example GitHub Actions workflow documents trigger strategy.
- Learning library & evaluation harness delivered with supporting manifests (`.runs/4/`, `.runs/5/`).
- Task 6 documentation mirrors (this file, `docs/ACTION_PLAN.md`, `docs/TECH_SPEC.md`) approved; see `.runs/6/2025-10-16T18-49-34Z/manifest.json` with spec guard, lint, and eval harness validations.

## Added by PRD Author 2025-10-18
- **Canonical Source:** `tasks/0001-prd-codex-orchestrator.md` (section “Added by PRD Author 2025-10-18”).
- **Focus:** Document the current Agents-SDK runner contract (`scripts/mcp-runner-start.sh` → `scripts/agents_mcp_runner.mjs`) and its manifest/log outputs under `.runs/0001/mcp/<run-id>/` (with `.runs/local-mcp/<run-id>/` maintained as a compatibility pointer) for builder/tester/reviewer agents.
- **Key Behaviors:** Start script forwards `--command`, `--approval-policy`, `--timeout`, `--format`; manifest tracks command statuses and response artifacts; poll script supports textual output by default and `--format json` for machine-readable snapshots saved alongside run artifacts. Diff artifact capture remains a backlog item.
- **Guardrails:** Default timeout remains 3600 seconds; spec-guard stays in the default command queue; automated diagnostics and retries are explicitly called out as future work.
- **Open Items:** Normalize manifest locations vs. task directories, add heartbeat/resume support, design metrics aggregation, and pin the Agents SDK version.
- **2025-10-18 Update:** Drafted `tasks/specs/0005-mcp-runner-enhancements.md` to govern directory migration, heartbeat/resume, and metrics logs; structured error artifacts now land under `errors/<index>-<slug>.json` with manifest references (2025-10-19 implementation), diagnostics prompts shipped 2025-10-19 with manifest summaries directing `scripts/run-mcp-diagnostics.sh --no-watch`, and Agents SDK pinning remains queued per task checklist section 7.
