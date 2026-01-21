# RLM OOLONG Fixture

Local sample + optional Hugging Face fetch config for OOLONG-style linear aggregation tests.

- Scenario: `rlm-oolong`
- Generator: `evaluation/benchmarks/rlm-oolong.mjs`
- Metric: % correct answers vs input context length (tokens from OOLONG `context_len` field).

## Modes
### Local (default)
Uses `sample.json` to keep CI deterministic and offline.

### Hugging Face (optional)
Use `fixture.hf.json` (or set `"dataset.source": "hf"` in `fixture.json`) and ensure the Python `datasets` package is installed:

```
python3 -m pip install datasets
```

The fetch helper pulls rows from `oolongbench/oolong-synth` and filters to the configured task types.
By default the HF config does not restrict `dataset_filter`; set `"dataset.dataset_filter"` (for example `trec_coarse`)
to narrow the dataset if you want to reduce variance.
To measure sampling variance, set `"dataset.sample_seed"` to enable deterministic reservoir sampling across the
full split. Seeded configs `fixture.hf.seed1.json` through `fixture.hf.seed5.json` are provided as examples.

Example run:
```
node --loader ts-node/esm evaluation/benchmarks/rlm-oolong.mjs \\
  --fixture evaluation/fixtures/rlm-oolong \\
  --config evaluation/fixtures/rlm-oolong/fixture.hf.json \\
  --output out/<task-id>/rlm-oolong/results.json
```
If `--output` is omitted, the benchmark writes to `/tmp/codex-rlm-oolong/results-<timestamp>.json`.
For large runs, set `"dataset.cache_path"` (for example `out/<task-id>/datasets/oolong-linear.json`) to reuse a cached JSON payload.
Paths are resolved relative to the repo root unless you prefix with `./` or `../` to force fixture-relative paths.

### Fallback length matching (optional)
If no rows match a target length, set `"fallback.length_tolerance"` (for example `0.05`) to retry missing lengths with a looser match. The output will annotate fallback-used lengths.

### Offline repeatability (optional)
Set `"dataset.offline": true` and point `"dataset.cache_path"` at a cached rows file to prevent network fetches.
To validate determinism, set `"repeatability.runs": 2` (or higher). The output includes a repeatability hash and matched flag.

## Plotting
Generate a PNG with the provided helper:

```
python3 -m pip install matplotlib
python3 scripts/plot-rlm-accuracy.py --input out/<task-id>/rlm-oolong/results.json --output out/<task-id>/graphs/oolong-accuracy.png --title "OOLONG Accuracy vs Context Length"
```

To aggregate multiple runs and add a mean +/- std ribbon, pass multiple inputs:

```
python3 scripts/plot-rlm-accuracy.py \
  --input out/<task-id>/rlm-oolong-hf-run1/results.json \
  --input out/<task-id>/rlm-oolong-hf-run2/results.json \
  --input out/<task-id>/rlm-oolong-hf-run3/results.json \
  --output out/<task-id>/graphs/oolong-hf-accuracy-runs3.png \
  --title "OOLONG HF Accuracy vs Context Length (mean +/- std)"
```
