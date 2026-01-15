# Follow-up Plan - 0951 True RLM Symbolic (PR166 Gaps)
**Status:** 0951 shipped (PR166). This doc tracks follow-up deltas for PR<next>.

## Purpose
Document the remaining contract gaps from PR166 so the next implementation PR can land with clear, testable requirements.

## Remaining Gaps (v1.1 contracts)
- Search hit offsets must be exposed to planners (chunk-relative `offset`, absolute `start_byte`, and `match_bytes`) with a **canonical JSONL prompt rendering**.
- UTF-8 boundary correctness: offsets are byte-based (0-index, half-open ranges) and remain stable when chunk boundaries split multi-byte codepoints.
- `delegate.spawn` start-only docs must align with JSON-RPC error handling, manifest polling rules, spawn timeout env vars, and the actual `spawn_failed` payload.
- Budgeting polish: clamp `searches[].top_k` and record the clamp in state; define combined snippet+span caps with deterministic ordering.

## Contract Updates (summary)

### Search hits (context.search)
Search must return pointers **and** offsets:
```json
{
  "pointer": "ctx:sha256:<hex>#chunk:c000042",
  "offset": 32768,
  "start_byte": 1234567,
  "match_bytes": 14,
  "preview": "..."
}
```
- `offset`, `start_byte`, and `match_bytes` are **required** (bytes from chunk start and absolute into `source.txt`).
- `match_bytes` is the UTF-8 byte length of `query.trim()`.

### Planner prompt rendering (runner → planner)
Required format for search hits in the planner prompt:
- JSONL (one object per line, no code fences).
- Each object includes `pointer`, `offset`, `start_byte`, `match_bytes`, `score`, `preview`.

Example line (no code fence):
`{"pointer":"ctx:...#chunk:c000012","offset":128,"start_byte":123456,"match_bytes":7,"score":3,"preview":"..."}`

### Byte + encoding semantics
- **Indexing convention (normative):** All byte offsets are 0‑indexed. Chunk boundaries use half‑open ranges: start is inclusive, end is exclusive. Span reads use `[start_byte, end_byte)` where `end_byte` is exclusive.
- Canonical offsets are UTF-8 byte offsets into `source.txt`.
- Use byte-native search (UTF-8 bytes in/bytes out). Previews are decoded for display only.
- ASCII-only casefolding for case-insensitive search; avoid Unicode casefolding to keep offsets stable.

### Budgeting semantics
- `searches[].top_k` clamps to `RLM_SEARCH_TOP_K` (or budgets.searchTopK) and the clamp is recorded in `rlm/state.json` (planned field: `searches[].clamped_top_k: true|false`).
- `RLM_MAX_SNIPPETS_PER_SUBCALL` applies to the combined count of `snippets[]` + `spans[]` (snippets first, then spans, in order). Clamping is recorded via `subcalls[].clamped.snippets`.

### delegate.spawn start-only docs alignment
- `start_only` defaults to true; `task_id` is required in that mode.
- Polling uses a baseline snapshot (new manifest only) and honors `CODEX_ORCHESTRATOR_RUNS_DIR`.
- Missing manifest before timeout returns `spawn_failed` with `task_id`, `runs_root`, `expected_manifest_glob`, `candidates`, and `error` (no `timeout_ms` field).
- Missing `task_id` surfaces as a JSON-RPC/tool error with message `"task_id is required when start_only=true"`.
- Success return shape is `{ run_id, manifest_path, events_path, log_path }` (log_path may be `null`).

## Validation Checklist
- UTF-8 boundary regression test: split a multi-byte codepoint across chunk boundary; confirm offsets match byte positions.
- Planner prompt rendering uses JSONL hits with required `offset`, `start_byte`, `match_bytes`.
- `searches[].top_k` clamp is enforced and recorded in state (`searches[].clamped_top_k`).
- Combined snippet + span cap is enforced (snippets first, then spans) and recorded.
- `delegate.spawn` doc example succeeds; missing `task_id` produces the JSON-RPC error shape; `spawn_failed` omits `timeout_ms`.
