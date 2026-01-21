# RLM OOLONG-Pairs Fixture

Local sample + optional Hugging Face fetch config for OOLONG-Pairs pairwise constraints.

- Scenario: `rlm-oolong-pairs`
- Generator: `evaluation/benchmarks/rlm-oolong-pairs.mjs`
- Metric: pairwise F1 + perfect-match % vs input context length (tokens from OOLONG `context_len` field).

## Modes
### Local (default)
Uses `sample.json` to keep CI deterministic and offline.

### Hugging Face (optional)
Use `fixture.hf.json` (or set `"dataset.source": "hf"` in `fixture.json`) and install the Python `datasets` package:

```bash
python3 -m pip install datasets
```

The fetch helper pulls rows from `oolongbench/oolong-synth`. The HF config defaults to
`"dataset.dataset_filter": null` with `"dataset.task_groups": ["user"]` to keep user-centric pairs while
avoiding overly narrow subsets; set `dataset_filter` (for example `trec_coarse`) if you want a tighter
slice or to mirror prior runs.
To measure sampling variance, set `"dataset.sample_seed"` to enable deterministic reservoir sampling across the
full split. Seeded configs `fixture.hf.seed1.json` through `fixture.hf.seed5.json` are provided as examples.

To aggregate multiple runs and add a mean +/- std ribbon, pass multiple inputs:

```bash
python3 scripts/plot-rlm-accuracy.py \
  --input out/<task-id>/rlm-oolong-pairs-hf-run1/results.json \
  --input out/<task-id>/rlm-oolong-pairs-hf-run2/results.json \
  --input out/<task-id>/rlm-oolong-pairs-hf-run3/results.json \
  --output out/<task-id>/graphs/oolong-pairs-hf-accuracy-runs3.png \
  --title "OOLONG-Pairs HF Accuracy vs Context Length (mean +/- std)"
```

Example run:
```bash
node --loader ts-node/esm evaluation/benchmarks/rlm-oolong-pairs.mjs \
  --fixture evaluation/fixtures/rlm-oolong-pairs \
  --config evaluation/fixtures/rlm-oolong-pairs/fixture.hf.json \
  --output out/<task-id>/rlm-oolong-pairs/results.json
```
If `--output` is omitted, the benchmark writes to `/tmp/codex-rlm-oolong-pairs/results-<timestamp>.json`.
For large runs, set `"dataset.cache_path"` (for example `out/<task-id>/datasets/oolong-pairs.json`) to reuse a cached JSON payload.
Paths are resolved relative to the repo root unless you prefix with `./` or `../` to force fixture-relative paths.

### Fallback length matching (optional)
If no rows match a target length, set `"fallback.length_tolerance"` (for example `0.05`) to retry missing lengths with a looser match. The output will annotate fallback-used lengths.

### Offline repeatability (optional)
Set `"dataset.offline": true` and point `"dataset.cache_path"` at a cached rows file to prevent network fetches.
To validate determinism, set `"repeatability.runs": 2` (or higher). The output includes a repeatability hash and matched flag.

## Plotting
Generate a PNG with the provided helper:

```bash
python3 -m pip install matplotlib
python3 scripts/plot-rlm-accuracy.py --input out/<task-id>/rlm-oolong-pairs/results.json --output out/<task-id>/graphs/oolong-pairs-accuracy.png --title "OOLONG-Pairs Accuracy vs Context Length"
```
