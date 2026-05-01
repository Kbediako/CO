# TECH_SPEC - CO-452 retire js_repl posture after Codex CLI 0.128.0 removal

Canonical technical specification: `tasks/specs/linear-d412792b-9a2a-43d9-96dc-ca021e728d09.md`.

This mirror exists for docs navigation and freshness tracking. The implementation contract is:

- Codex CLI `0.128.0` reports `js_repl` and `js_repl_tools_only` as `removed false`.
- Current CO guidance must not say `js_repl` is default-on or break-glass toggleable.
- Generic cloud feature flag support remains available for non-removed feature names.
- Active tests and examples must not use `js_repl` as a normal cloud feature.
- Historical `js_repl` evidence-gate docs must be labeled history-only rather than deleted.

Last reviewed: 2026-05-01.
