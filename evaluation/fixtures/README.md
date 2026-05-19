# Evaluation Fixtures

Fixtures provide deterministic workspaces for exercising language adapters in the evaluation harness.

- `typescript-smoke` — Minimal TypeScript project with npm scripts that run local Node checks. Scenario: `typescript-smoke`.
- `python-smoke` — Lightweight Python layout with build/test scripts that avoid external dependencies. Scenario: `python-smoke`.
- `go-smoke` — Minimal Go module with a small package and unit test. Scenario: `go-smoke`.
- `rlm-context-scale` — Synthetic, deterministic context-length benchmark fixture for RLM context management. Scenario: `rlm-context-scale`.
- `rlm-oolong` — OOLONG-inspired linear aggregation fixture (local sample + optional HF fetch). Scenario: `rlm-oolong`.
- `rlm-oolong-pairs` — OOLONG-Pairs fixture (pairwise constraints, local sample + optional HF fetch). Scenario: `rlm-oolong-pairs`.
- `provider-linear-adoption` — Sanitized provider-linear run artifacts for `npm run eval:provider-adoption`, covering source_0, prompt-pack, parallelization, child-lane, follow-up, link, and workpad adoption metrics.
- `review-contract` — Sanitized governed-review contract cases covering spec, standards, code proposal, agent-loop proposal, and legacy prose-clean fail-closed scenarios.

All fixtures are treated as read-only source material. The harness copies the fixture to a temporary directory when a scenario or adapter command sets `requiresCleanFixture` to `true`.
The OOLONG fixtures also support optional fallback length matching and repeatability checks; see each fixture README for configuration.
Provider adoption fixtures must contain pointer metadata only. Do not commit raw provider transcripts, live Linear payloads, secrets, PII, or unsanitized operator text; add new provider-run cases by trimming artifacts to `manifest.json`, `provider-linear-worker-proof.json`, and `prompt-artifacts.json` with synthetic summaries and stable pointer references.
