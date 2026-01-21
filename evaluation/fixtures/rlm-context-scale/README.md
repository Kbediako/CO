# RLM Context Scale Fixture

Synthetic, deterministic contexts for benchmarking RLM context management versus a baseline scan.

- Scenario: `rlm-context-scale`
- Generator: `evaluation/benchmarks/rlm-context-scale.mjs`
- Metric: % correct answers vs input context length (characters).

Notes:
- Contexts are generated on the fly from `fixture.json` to avoid committing large files.
- The generator inserts a fixed needle string at deterministic offsets per trial.
- Sizes top out at 1,000,000 characters for easy baseline vs RLM comparison.
