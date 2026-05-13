# TECH_SPEC - CO-480 MultiAgentV2 0.128 thread-cap audit

## Summary
- Objective: preserve CO-354 `agents.max_threads` rejection/omission under MultiAgentV2 while adding current Codex CLI 0.128 cap guidance for `features.multi_agent_v2.max_concurrent_threads_per_session`.
- Canonical spec: `tasks/specs/linear-3abba033-52f0-45f3-af58-cce4939f087f.md`
- Task id: `linear-3abba033-52f0-45f3-af58-cce4939f087f`
- Source issue: `CO-466` / `bdfd9046-97b5-43bd-850f-b305558cdada`

## Requirements
- Document the Codex CLI 0.128 v2-specific cap path `features.multi_agent_v2.max_concurrent_threads_per_session`.
- Preserve and test omission/rejection of `agents.max_threads` when `features.multi_agent_v2=true`.
- Update doctor/default/init behavior or explicitly classify the v2-specific cap as user-owned with actionable doctor guidance.
- Add focused tests or command probes for old-path rejection and new-path acceptance.
- Preserve stable `features.multi_agent=true` `[agents] max_threads = 12`.

## Validation
- Focused `Doctor`, `CodexDefaultsSetup`, and `InitTemplates` tests cover the user-owned doctor classification, configured feature-scoped cap, invalid cap advisory, and old-path omission under table-form v2 config.
- Command probes in `out/linear-3abba033-52f0-45f3-af58-cce4939f087f/manual/multi-agent-v2-cap-probes.jsonl` cover old-path rejection and new-path acceptance against active local Codex.
- Full provider-worker guard lane before handoff, with inherited docs-freshness baseline failures routed explicitly when they are outside CO-480.
- Manifest-backed standalone review and explicit elegance pass before review transition.
