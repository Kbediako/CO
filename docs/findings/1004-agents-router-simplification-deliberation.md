# Findings - 1004 AGENTS Router Simplification Deliberation

- Date: 2026-03-05
- Task: `1004-codex-0110-version-policy-refresh-and-adoption-sequencing`
- Scope: evaluate AGENTS routing-surface complexity and define phased simplification posture without merge-order changes.

## Completed Audit Sources
- Local AGENTS routing audit: `out/1004-codex-0110-version-policy-refresh-and-adoption-sequencing/manual/20260305T074053Z-docs-first/04b-local-agents-router-audit.log`
- Local AGENTS supplemental audit: `out/1004-codex-0110-version-policy-refresh-and-adoption-sequencing/manual/20260305T074053Z-docs-first/04-local-agents-router-audit.log`

## Fact Register

### Confirmed
- [confirmed] Routing guidance is distributed across three active surfaces:
  - `AGENTS.md` (`228` lines),
  - `docs/AGENTS.md` (`127` lines),
  - `templates/codex/AGENTS.md` (`75` lines).
- [confirmed] Shared control-plane/router sections are present across these surfaces (`MCP vs Collab`, docs-first, deliberation, orchestration/delegation guidance).
- [confirmed] Top-level AGENTS includes a current instruction stamp (`codex:instruction-stamp` present).

### Inferred
- [inferred] Current multi-surface routing guidance increases drift probability when policy updates land quickly (for example version-policy or delegation defaults).
- [inferred] Simplification should be phased rather than a broad rewrite to preserve reviewer auditability and avoid accidental behavior/policy changes.
- [inferred] Merge-order invariants should remain unchanged during simplification to avoid introducing workflow regressions while docs are being normalized.

## 1008 Planning Constraints (from this deliberation)
- Phase 1: inventory + canonical-source mapping (no behavioral changes).
- Phase 2: wording/structure simplification with explicit parity checks.
- Phase 3: optional consolidation proposals only after parity evidence and reviewer confirmation.
- Hard rule: no merge-order changes in the simplification lane.
