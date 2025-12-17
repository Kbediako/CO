# Evaluation Fixtures

Fixtures provide deterministic workspaces for exercising language adapters in the evaluation harness.

- `typescript-smoke` — Minimal TypeScript project with npm scripts that run local Node checks. Scenario: `typescript-smoke`.
- `python-smoke` — Lightweight Python layout with build/test scripts that avoid external dependencies. Scenario: `python-smoke`.
- `go-smoke` — Minimal Go module with a small package and unit test. Scenario: `go-smoke`.

All fixtures are treated as read-only source material. The harness copies the fixture to a temporary directory when a scenario or adapter command sets `requiresCleanFixture` to `true`.
