# TECH_SPEC - CO-354 multi_agent_v2 thread-limit safe defaults

## Summary
- Objective: align CO doctor/default setup with Codex CLI `0.125.0` rejecting `agents.max_threads` when `features.multi_agent_v2=true`.
- Canonical spec: `tasks/specs/linear-bf27af4a-01b6-4006-a39b-a9c668be8548.md`
- Task id: `linear-bf27af4a-01b6-4006-a39b-a9c668be8548`

## Requirements
- Detect enabled `multi_agent_v2` from Codex feature output and config fallback.
- Omit `agents.max_threads` from defaults/init writes only for enabled `multi_agent_v2`.
- Report doctor max_threads as skipped/compatible-safe under enabled `multi_agent_v2`.
- Preserve existing stable `multi_agent` and older-Codex behavior.
- Cover stable, config-v2, feature-list-v2, nonnumeric-present, and older-Codex cases with targeted tests.
- Update docs/templates to state the conditional rule.

## Validation
- Targeted `Doctor`, `CodexDefaultsSetup`, and `InitTemplates` tests.
- Full repo guard lane before handoff.
- Manifest-backed standalone review and explicit elegance pass before review transition.
