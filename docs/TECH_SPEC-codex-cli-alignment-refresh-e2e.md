# TECH_SPEC - Codex CLI Alignment + Refresh E2E (0963)

## Summary
- Objective: Align local Codex with upstream, reduce operational friction in refresh/setup flows, and codify when managed/custom CLI is required.
- Scope: refresh script/docs/setup guidance changes, plus manual E2E validation artifacts.
- Constraints: no broad refactor; maintain backward compatibility for current users.

## Technical Requirements
- Functional requirements:
  - Local codex fork must fast-forward to upstream/main using a deterministic workflow.
  - Refresh script must clearly support align-only vs align+rebuild behavior.
  - README and guides must define stock CLI default path and managed CLI opt-in path.
  - Keep managed CLI build/download support intact for parity or pinning scenarios.
- Non-functional requirements:
  - Non-interactive-safe command behavior.
  - Actionable output for success/failure states.
  - No changes that force extra dependencies for downstream users.
- Interfaces / contracts:
  - `scripts/codex-cli-refresh.sh` options and output remain stable or strictly additive.
  - `codex-orchestrator codex setup` remains backward compatible.

## Decisions
- Custom/managed Codex CLI is **optional**, not required for baseline CO operation.
- Default operator path is stock `codex`; managed CLI is for pinned/fork-specific workflows.
- Refresh flow now supports explicit align-only mode (`--align-only`) so users can sync forks without triggering a rebuild.

## Architecture and Data
- Architecture / design adjustments:
  - Script-level ergonomic improvements around refresh/rebuild choices.
  - Docs-level separation of "stock path" and "managed path".
- Data model changes / migrations:
  - None.
- External dependencies / integrations:
  - Git remotes (`upstream`, `origin`) for local codex repo.
  - Optional CO-managed binary config under `~/.codex/orchestrator/codex-cli/`.

## Validation Plan
- Tests / checks:
  - Standard guardrail command chain from AGENTS.
- Rollout verification:
  - Manual E2E: refresh script run, codex version/features check, orchestrator command smoke with expected behavior.
- Monitoring / alerts:
  - Capture manifests/logs under `.runs/0963-*` and `out/0963-*/manual/`.

## Open Questions
- None blocking.

## Approvals
- Reviewer: Codex (self)
- Date: 2026-02-14
