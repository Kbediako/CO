# TECH_SPEC - CO-452 retire js_repl posture after Codex CLI 0.128.0 removal

Canonical technical specification: `tasks/specs/linear-d412792b-9a2a-43d9-96dc-ca021e728d09.md`.

This mirror exists for docs navigation and freshness tracking. The implementation contract is:

- Codex CLI `0.128.0` reports `js_repl` and `js_repl_tools_only` as `removed false`.
- Current CO guidance must not say `js_repl` is default-on or break-glass toggleable.
- Generic cloud feature flag support remains available for non-removed feature names.
- Active tests and examples must not use `js_repl` as a normal cloud feature.
- Historical `js_repl` evidence-gate docs must be labeled history-only rather than deleted.

## CO-382 Fallback Metadata
- Large-refactor check: no large refactor is required because CO-452 removes the stale `js_repl` active posture instead of adding another compatibility layer.
- Minor-seam check: the bounded minor-seam removal is acceptable because generic cloud feature pass-through remains intact while only removed-feature guidance and canary affordances are retired.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `js_repl` active posture guidance | default-on, break-glass, and cloud feature-contract guidance for a removed feature | remove fallback | CO-452 | Codex CLI `0.128.0` removed `js_repl` | 2026-03-03 | 2026-05-01 | immediate removal | current-facing docs no longer recommend `js_repl` enable/disable or cloud feature toggles | `rg`, docs checks, focused cloud feature tests |
| scripts/js-repl-usage-matrix.mjs | active canary matrix for a removed feature | remove fallback | CO-452 | Codex CLI `0.128.0` removed `js_repl` | 2026-03-02 | 2026-05-01 | immediate removal | package script and source checkout no longer expose the `js_repl` canary as current guidance | package script audit and focused cloud feature tests |

Last reviewed: 2026-05-01.
