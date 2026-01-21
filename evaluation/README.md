# Evaluation Harness

The evaluation harness runs adapter commands against managed fixtures to verify build/test behaviors before syncing assets to Codex Cloud.

## Usage

- `npm run eval:test` — Executes Vitest suites under `evaluation/tests/**`.
- Programmatic helpers live in `evaluation/harness/index.ts` for invoking scenarios from scripts/tests; the unused CLI wrappers were removed in Task 0801.

Harness helpers:

- `runScenario(id, options)` — Load a scenario from `evaluation/scenarios/*.json`, run adapter goals sequentially, and return a structured result.
- `runAllScenarios(options)` — Execute every registered scenario in order (or pass `scenarioIds` to limit the run).

Scenario options include:

- `mode`: `'mcp'` (default) or `'cloud'` for metadata tagging.
- `outputDir`: Directory for persisted JSON results (e.g., `.runs/5/<run>/evaluation`).
- `defaultTimeoutMs`: Override the default 30s timeout per command.

Fixtures live under `evaluation/fixtures/**` and include per-scenario READMEs describing their checks.
