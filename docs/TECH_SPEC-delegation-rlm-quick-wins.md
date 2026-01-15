# Technical Spec - Delegation Guard Actionable Diagnostics (Task 0951)

## Overview
- Objective: Enhance `scripts/delegation-guard.mjs` diagnostics, remove long-running `delegate.spawn` timeouts via async/start-only behavior, implement true RLM semantics (externalized context + symbolic recursion), and fix implementation-docs archive automation issues surfaced in PR #165.
- In Scope: Diagnostic messaging, detected/expected manifest path reporting, async `delegate.spawn` semantics, true RLM context model, doc-archives payload validation/stub correctness, optional SOP troubleshooting note.
- Out of Scope: Changes to delegation policy, guard pass criteria, or archive policy definitions.

## TRUE RLM Scope (this doc)
- RLM definition reference: treat large prompts as external environment objects; the model inspects/decomposes them and recursively issues subcalls over snippets it constructs (see arXiv 2512.24601 and `github.com/alexzhang13/rlm` for baseline framing).
- This milestone implements **symbolic runner-managed RLM** (no general REPL code execution yet):
  - Externalize long context into a run-scoped context object (source + chunk index).
  - Root model does **not** receive full context; it receives metadata + bounded excerpts only.
  - Root model emits a structured plan; the runner executes **reads/searches/subcalls** and returns bounded results.
  - Recursion depth is **1** in v1 (subcalls are plain LM completions). Deeper recursion is future work.
- Compatibility note: this is **not** a general REPL runtime; it is a symbolic mode that can later map `context.*` helpers to a REPL if/when we add that execution model.

## Architecture & Design
### Current State
- Guard fails with generic messages when `MCP_RUNNER_TASK_ID` is missing or when no subagent manifests are found.
- Operators often need to inspect `.runs/` manually to infer what’s missing.
- The `rlm` pipeline runs an iterative Codex loop with a prompt assembled per iteration (goal + diff/validator summary). It does not externalize large prompts or schedule subcalls symbolically.

### Terminology
- Tool call: a model-authored call to an orchestrator tool within a single Codex execution.
- Delegation / subagent run: a separate orchestrator run spawned via `delegate.spawn`, producing its own `manifest.json`.
- Subcall (symbolic recursion): a **runner-scheduled single completion** over pointer-referenced snippets (no tools, no repo writes), emitting artifacts and structured results to the parent loop.

### Proposed Changes
- Add structured failure output with:
  - Missing environment variables (`MCP_RUNNER_TASK_ID`).
  - Expected subagent manifest locations (`<runs-root>/<task-id>-*/cli/<run-id>/manifest.json`), honoring `CODEX_ORCHESTRATOR_RUNS_DIR` when set.
  - Any discovered candidate manifests (cap 3) with short rejection reasons.
  - Copy/pasteable fix guidance (example task ID prefix + subagent command skeleton).
  - `DELEGATION_GUARD_OVERRIDE_REASON` surfaced when set.
- Add a deterministic output schema example to keep formatting stable across runs.
- Keep success-path output unchanged to avoid noisy logs.
- Optional: Add a short troubleshooting note to `.agent/SOPs/review-loop.md` referencing the new diagnostics.
- Update delegation usage docs (`skills/delegation-usage/*` and `docs/delegation-runner-workflow.md`) to clarify `delegate.mode` vs `delegate_mode`, recommend RLM depth/time overrides, and document the current `delegate.spawn` long-run timeout limitation + workaround.
- Add async/start-only behavior to `delegate.spawn` with explicit parameter `start_only: boolean` (default `true`) that:
  - Requires `task_id` when `start_only=true` (return an error if missing) so polling is deterministic.
  - Spawns `codex-orchestrator start <pipeline> --format json --no-interactive --task <task_id>` detached/unref; child stdio must not be inherited (redirect or drain so the parent tool call can return).
  - Polls `<runs_root>/<task_id>/cli/*/manifest.json` for a newly created manifest (created after `spawnTime`) with a 10s target timeout (configurable). Do **not** rely on stdout parsing.
  - Reads `run_id` + `manifest_path` from the manifest and returns those plus derived `{ events_path, log_path }`.
  - Persists the delegation token as soon as `manifest_path` is known; do not wait for child exit.
  - Continues draining/ignoring child stdout/stderr after returning to avoid pipe backpressure.
  - Keeps the child process running in the background without blocking the tool call; use `delegate.status` for progress.
  - On timeout (no manifest found), return `spawn_failed` with runs_root, task_id, and any candidate manifests discovered.
- Implement “true RLM” behavior (symbolic recursion):
  - Externalize long prompts into a context object (indexed file or chunk store) with pointer-based access.
  - Add context helpers (search/peek/read-chunk) that operate on the object without loading the full prompt into the model.
  - Use runner-scheduled subcalls over context pointers rather than model-authored O(N) tool calls.
  - Define a planner protocol (schema + validation + termination) for symbolic steps.
  - Define context ingestion rules for raw files vs prebuilt context objects.
  - Record subcall inputs/outputs as artifacts and include pointer references in `rlm/state.json`.
- Fix implementation-docs archive automation for PR #165:
  - Ensure doc-archives payloads are written before stubs land.
  - Validate that stub URLs point to existing files (or fail fast).
  - Provide a diff-budget strategy (split changes or set `DIFF_BUDGET_OVERRIDE_REASON` with a rationale in automation).

### True RLM Architecture (symbolic recursion)
- **Context object**: write the large prompt into a structured file stored under `.runs/<task>/cli/<run>/rlm/context/` as `{source.txt,index.json}` (no `<object_id>` subfolder).
- **Pointer-based access**: provide helper APIs to `search`, `peek`, and `read` by chunk id or byte range.
- **Runner‑scheduled subcalls**: the runner creates subcalls over chunks and dispatches them, rather than requiring the model to emit O(N) tool calls.
- **Artifacts**: subcall inputs/outputs are saved as artifacts and referenced in `rlm/state.json` with their pointer IDs.
- **Delegation integration**: with `RLM_MODE=auto` (default), resolve to `symbolic` when delegated (`CODEX_DELEGATION_PARENT_MANIFEST_PATH` set) **or** `RLM_CONTEXT_PATH` is set **or** `context_bytes` ≥ `RLM_SYMBOLIC_MIN_BYTES` (default 1 MB); otherwise resolve to `iterative`. Standalone `rlm` can still opt in with `RLM_MODE=symbolic` or `RLM_CONTEXT_PATH`.

### Async/start-only `delegate.spawn`: intended algorithm
1) Accept `start_only?: boolean` (default `true`). When `start_only=false`, preserve legacy wait-for-exit behavior.
2) If `start_only=true`, require `task_id` (error if missing).
3) Snapshot existing `.runs/<task_id>/cli/` directories before spawn.
4) Spawn `codex-orchestrator start <pipeline> --format json --no-interactive --task <task_id>` detached/unref.
5) Poll `.runs/<task_id>/cli/*/manifest.json` for a **new** manifest not in the snapshot (or with mtime > spawn start time); timeout after `SPAWN_START_TIMEOUT_MS` (10–30s).
6) Read `manifest.json` → `run_id`, compute `manifest_path`, `events_path` (dirname + `events.jsonl`), and `log_path` (if present).
7) Persist delegation token **before** returning.
8) Return `{ run_id, manifest_path, events_path, log_path }` without waiting for child exit.

Stdio / MCP safety:
- Delegation server speaks MCP over stdout. Child stdout must **not** be inherited to the delegation server stdout.
- In `start_only` mode, do **not** buffer child stdout/stderr in memory. Either discard or redirect to files so pipes cannot fill and stall the child.

#### Context object format (v1)
Single context per run, stored directly under `.runs/<task>/cli/<run>/rlm/context/` (no `<object_id>` subfolder).
On-disk layout:
- `.runs/<task>/cli/<run>/rlm/context/`
  - `source.txt` (raw externalized context)
  - `index.json` (chunk table + metadata)

`index.json` (v1 schema, normative):
- Required top-level keys: `version`, `object_id`, `created_at`, `source`, `chunking`, `chunks`.
- `source` requires: `path`, `byte_length`.
- `chunking` requires: `target_bytes`, `overlap_bytes`, `strategy`.
- Each `chunks[]` entry requires: `id`, `start`, `end`, `sha256`.
The schema above is normative for v1; PRD acceptance criteria and tests must match these keys and names.

Example:
```
{
  "version": 1,
  "object_id": "sha256:<hex>",
  "created_at": "<iso>",
  "source": { "path": "source.txt", "byte_length": 123456789 },
  "chunking": { "target_bytes": 65536, "overlap_bytes": 4096, "strategy": "byte" },
  "chunks": [
    { "id": "c000001", "start": 0, "end": 65536, "sha256": "..." },
    { "id": "c000002", "start": 61440, "end": 126976, "sha256": "..." }
  ]
}
```
Defaults: `chunking.target_bytes=65536`, `chunking.overlap_bytes=4096`.

Pointer syntax:
- `ctx:<object_id>#chunk:<chunk_id>` (example: `ctx:sha256:abcd...#chunk:c000042`)

#### Context ingestion contract (v1)
- `context_source` is `RLM_CONTEXT_PATH` if set, else the effective prompt text; compute `context_bytes` from the chosen source.
- `RLM_CONTEXT_PATH` may point to:
  - A raw text file (runner builds a new context object under `.runs/.../rlm/context/`), or
  - An existing context object directory containing `index.json` + `source.txt` (runner uses it directly).
- When `context_source` is a context object directory, `context_bytes` comes from `index.json` (`source.byte_length`) or the `source.txt` byte length.
- Context is treated as UTF-8 bytes. All offsets in `index.json` are **byte offsets** into `source.txt`.
- If decoding fails, the runner stores bytes and uses a lossy UTF-8 decode for previews, but all slicing remains byte-based.

#### Symbolic recursion loop (runner contract)
1) Initialize
- Build/load context object (`source.txt` + `index.json`).
- Initialize `rlm/state.json` with `context.object_id`, `chunk_count`, budgets.
2) Plan step (small prompt)
- Call planner with goal + repo summary + context metadata (not full content).
- Planner returns structured JSON plan:
```
{
  "schema_version": 1,
  "intent": "continue",
  "reads": [
    { "pointer": "ctx:...#chunk:c000010", "offset": 0, "bytes": 4096, "reason": "inspect failure section" }
  ],
  "searches": [
    { "query": "validator failure", "top_k": 10, "reason": "locate failing tests" }
  ],
  "subcalls": [
    {
      "purpose": "summarize",
      "snippets": [
        { "pointer": "ctx:...#chunk:c000010", "offset": 0, "bytes": 2048 },
        { "start_byte": 123456, "bytes": 2048 }
      ],
      "max_input_bytes": 120000,
      "expected_output": "short summary"
    }
  ]
}
```
3) Runner executes subcalls
- `search`: bounded search over context store → pointers + offsets.
- `summarize`: read bounded chunk text → runner completion (no tools) → artifact saved.
4) Aggregate + iterate
- Runner appends results + artifact references to `rlm/state.json`.
- Next planner call receives only aggregated results + minimal excerpts.
5) Terminate
- Planner returns `intent=final` with `final_answer` (string). The runner persists final state and exits.

#### Planner protocol (normative)
- The planner must output a single JSON object per step (no surrounding prose).
- Schema (v1) — required fields: `schema_version`, `intent`. `reads`, `searches`, `subcalls` may be omitted or empty.
```
{
  "schema_version": 1,
  "intent": "continue | final | pause | fail",
  "reads": [
    { "pointer": "ctx:<object_id>#chunk:<chunk_id>", "offset": 0, "bytes": 4096, "reason": "..." },
    { "start_byte": 123456, "bytes": 4096, "reason": "..." }
  ],
  "searches": [
    { "query": "...", "top_k": 20, "reason": "..." }
  ],
  "subcalls": [
    {
      "purpose": "summarize | extract | classify | verify",
      "snippets": [
        { "pointer": "ctx:<object_id>#chunk:<chunk_id>", "offset": 0, "bytes": 2048 },
        { "start_byte": 123456, "bytes": 2048 }
      ],
      "spans": [
        { "start_byte": 123456, "end_byte": 124000 }
      ],
      "max_input_bytes": 120000,
      "model": "optional",
      "expected_output": "short summary | json | bullet list"
    }
  ],
  "final_answer": "required when intent=final"
}
```
- Validation rules:
  - `intent` must be one of `continue|final|pause|fail`.
  - Each `reads[]` entry requires `bytes` and **either** (`pointer` + `offset`) **or** `start_byte`. Offsets are relative to the chunk start; `start_byte` is absolute into `source.txt`. Bytes are clamped to `RLM_MAX_BYTES_PER_CHUNK_READ`.
  - Pointer entries must parse and the `object_id` must match the active context; invalid pointers are treated as `plan_validation_error` (and retried once).
  - Each `searches[]` entry requires `query`; `top_k` defaults to `RLM_SEARCH_TOP_K`.
  - Each `subcalls[]` entry requires `purpose` (allowed: `summarize|extract|classify|verify`), `max_input_bytes`, and either non-empty `snippets[]` **or** non-empty `spans[]`.
    - Each `snippets[]` entry requires `bytes` and **either** (`pointer` + `offset`) **or** `start_byte`.
    - Each `spans[]` entry requires `start_byte` + `end_byte` and is clamped to `RLM_MAX_BYTES_PER_SNIPPET`.
- Validation + recovery:
  - If JSON parse fails, record `plan_parse_error` in `rlm/state.json` and retry planner once with an explicit “return valid JSON only” repair prompt. If it fails twice, hard-fail with `invalid_config`.
  - If schema validation fails, record `plan_validation_error` and retry once with a repair prompt; if it fails twice, hard-fail with actionable error.
  - If `intent=final` is returned before any subcall has executed, record `plan_validation_error` and retry once with guidance to run at least one subcall.
  - Clamp `reads`, `searches`, `subcalls` counts to per-iteration budgets and record any clamping in state.
  - Unknown `purpose` values are rejected (or mapped to `summarize`) deterministically.
- A **symbolic recursion cycle** is: planner step → runner executes ≥1 subcall → runner feeds back subcall outputs (artifact refs + bounded excerpts) → next planner step or `intent=final`.

Budgets enforced by runner:
- `RLM_MAX_SUBCALLS_PER_ITERATION` (default 4)
- `RLM_MAX_CHUNK_READS_PER_ITERATION` (default 8)
- `RLM_MAX_BYTES_PER_CHUNK_READ` (default 8192)
- `RLM_MAX_SNIPPETS_PER_SUBCALL` (default 8)
- `RLM_MAX_BYTES_PER_SNIPPET` (default 8192; applies to snippets and spans)
- `RLM_MAX_SUBCALL_INPUT_BYTES` (default 120000)
- `RLM_MAX_PLANNER_PROMPT_BYTES` (default 32768; measured as UTF-8 bytes). If the assembled planner prompt would exceed this limit, omit lowest-priority excerpts (search results, then read excerpts) until within budget; record truncation in `rlm/state.json`.
- Optional `RLM_MAX_CONCURRENCY`
- `RLM_SYMBOLIC_MIN_BYTES` (default 1 MB / 1048576 bytes)
- Chunking defaults: `target_bytes=65536`, `overlap_bytes=4096`.

#### Context helper APIs (v1)
- `context.read(pointer, offset=0, bytes=RLM_MAX_BYTES_PER_CHUNK_READ)` (bytes are clamped to `RLM_MAX_BYTES_PER_CHUNK_READ`)
  - Offset is relative to chunk start; read returns at most `bytes` and is clamped to the chunk boundaries; invalid pointers raise a deterministic error.
- `context.read_span(start_byte, bytes)` (absolute into `source.txt`; bytes clamped to `RLM_MAX_BYTES_PER_CHUNK_READ`)
- `context.peek(pointer, bytes=256)` (optional)
- `context.search(query, top_k=RLM_SEARCH_TOP_K)`
  - Deterministic ASCII-only case-insensitive substring scan over chunk text (A–Z only; non-ASCII is case-sensitive).
  - Sorted by: descending hit count → ascending first-hit byte offset → ascending chunk id.
  - Default `RLM_SEARCH_TOP_K=20`.
  - Returns up to `top_k` hits with:
```
{ "pointer": "...", "start_byte": 123, "end_byte": 456, "score": 17, "preview": "..." }
```
  - `start_byte`/`end_byte` are byte offsets into `source.txt`.
  - Use `start_byte` to form precise `reads[]` or `snippets[]` without re-scanning the chunk.
  - `preview` is capped at `RLM_MAX_PREVIEW_BYTES`.

#### Subcall execution contract (v1)
- Subcalls are runner-scheduled **single-completion** invocations over pointer-resolved text (not a full tool-enabled Codex session).
- Depth = 1 only for this milestone.
- Behavioral contract: no tools and no repo writes (enforcement can follow later).
- Input assembly (normative):
  - For each subcall, build inputs from `snippets[]` (or `spans[]`) in order.
  - Clamp each snippet to `RLM_MAX_BYTES_PER_SNIPPET` and cap snippet count at `RLM_MAX_SNIPPETS_PER_SUBCALL`.
  - Clamp each span to `RLM_MAX_BYTES_PER_SNIPPET`.
  - Clamp total subcall input bytes to `min(subcall.max_input_bytes, RLM_MAX_SUBCALL_INPUT_BYTES)`; drop or truncate trailing snippets to fit.
  - Record any clamping/truncation in `rlm/state.json` for auditability.
- Runner may execute subcalls concurrently up to `RLM_MAX_CONCURRENCY`.
- Subcall artifacts are written under:
  - `.runs/<task>/cli/<run>/rlm/subcalls/<iter>/<subcall_id>/{input.json,prompt.txt,output.txt,meta.json}`
- `rlm/state.json` stores references to artifacts + byte counts; it does not inline large text.
- Recursion depth is **1** (subcalls do not spawn further subcalls in v1).

#### Mode selection (delegation vs standalone)
- `RLM_MODE=iterative|symbolic|auto`
- Default: `RLM_MODE=auto` everywhere.
- `delegated` means `CODEX_DELEGATION_PARENT_MANIFEST_PATH` is set.
- Define `context_source` as: `RLM_CONTEXT_PATH` if set, else the effective prompt text. Use `context_bytes` from the chosen source.
- If `RLM_MODE=symbolic`: require a valid `context_source` or exit with `invalid_config`.
- If `RLM_MODE=auto`: resolve to `symbolic` when `delegated` **or** `RLM_CONTEXT_PATH` is set **or** `context_bytes` ≥ `RLM_SYMBOLIC_MIN_BYTES` (default 1 MB); otherwise resolve to `iterative`.

#### Symbolic mode scope + exit behavior
- Scope: v1 symbolic mode is analysis-only (planner JSON protocol + runner-managed reads/searches/subcalls). No repo writes and no validator loop.
- Exit codes:
  - `intent=final` → exit 0
  - `invalid_config` (e.g., missing required context or repeated plan repair failure) → exit 5
  - budget exhaustion → exit 3
  - internal error → exit 10

### Data Persistence / State Impact
- Guard diagnostics: no persistent state changes.
- True RLM: writes run-scoped artifacts under `.runs/<task>/cli/<run>/rlm/`:
  - `context/` (externalized context object)
  - `subcalls/` (inputs/outputs per subcall)
  - `state.json` extended with context metadata + subcall references
- No global state; all artifacts are run-scoped for auditability.

`rlm/state.json` v1 extension (normative, additive):
- Compatibility: extend the existing `RlmState` structure in-place; do not remove or rename existing fields.
- Required top-level keys: `version`, `mode`, `context`, `symbolic_iterations` (do not use `context_object_id` or `symbolic:{iterations}` variants).
- `context` requires: `object_id`, `index_path`, `chunk_count`.
- Each `symbolic_iterations[]` entry requires: `planner_prompt_bytes`, `reads[]`, `subcalls[]`.
  - `reads[]` entries record `pointer` + `offset` **or** `start_byte`, plus `bytes`.
  - `subcalls[]` entries record `snippets[]` (or `spans[]`) and any clamping/truncation metadata.
- Each `subcalls[]` entry requires `artifact_paths` with `input`, `prompt`, `output`, `meta`.

Example `rlm/state.json` (additive v1; existing fields remain valid):
```
{
  "version": 1,
  "mode": "symbolic",
  "context": {
    "object_id": "sha256:...",
    "index_path": ".runs/<task>/cli/<run>/rlm/context/index.json",
    "chunk_count": 128
  },
  "symbolic_iterations": [
    {
      "iteration": 0,
      "planner_prompt_bytes": 24380,
      "reads": [
        { "pointer": "ctx:sha256:...#chunk:c000010", "offset": 0, "bytes": 4096 }
      ],
      "subcalls": [
        {
          "id": "sc0001",
          "purpose": "summarize",
          "snippets": [
            { "pointer": "ctx:sha256:...#chunk:c000010", "offset": 0, "bytes": 2048 }
          ],
          "artifact_paths": {
            "input": ".runs/<task>/cli/<run>/rlm/subcalls/0/sc0001/input.json",
            "prompt": ".runs/<task>/cli/<run>/rlm/subcalls/0/sc0001/prompt.txt",
            "output": ".runs/<task>/cli/<run>/rlm/subcalls/0/sc0001/output.txt",
            "meta": ".runs/<task>/cli/<run>/rlm/subcalls/0/sc0001/meta.json"
          },
          "clamped": { "snippets": false, "bytes": false },
          "status": "succeeded"
        }
      ]
    }
  ]
}
```

### External Dependencies
- None.

## Operational Considerations
- Failure Modes:
  - Guard still fails when evidence is missing; output should help resolve quickly.
  - `tasks/index.json` unreadable or missing.
  - `MCP_RUNNER_TASK_ID` not registered in `tasks/index.json`.
  - Runs directory unreadable (`CODEX_ORCHESTRATOR_RUNS_DIR` or default `.runs`).
  - Override path (`DELEGATION_GUARD_OVERRIDE_REASON`) should be surfaced in output for clarity.
  - `delegate.spawn` returns but token is missing → question queue fails (must persist token before return).
  - Archive stubs reference missing doc-archives payloads.
  - Diff budget check fails when automation produces large batch diffs.
- Observability & Telemetry:
  - Emit clear headings and stable ordering to make CI logs easy to scan.
- Security / Privacy:
  - Do not print sensitive env vars; only show expected paths and task IDs.
- Performance Targets:
  - Keep additional filesystem scanning minimal (reuse existing checks).
  - Context object reads should be chunked and bounded (avoid loading full files into memory).

## Implementation Notes (true RLM)
- Store the context object alongside run artifacts so it is auditable and versioned with the run.
- Keep a stable chunk id scheme (content hash or sequential ids) to make subcall references deterministic.
- RLM should accept an external context file path (e.g., `RLM_CONTEXT_PATH`) to avoid re-chunking on each run.
- Log prompt byte size or store prompt snapshots so “pointer-only contract” is verifiable.

## Testing Strategy
- Unit / Integration:
  - No `MCP_RUNNER_TASK_ID` set → emits missing env guidance.
  - Task ID set but no subagent manifests → emits expected paths + fix steps.
  - Unreadable `tasks/index.json` → emits actionable error.
  - Unregistered task ID → explicit registration guidance.
  - Unreadable runs dir → actionable error.
  - `CODEX_ORCHESTRATOR_RUNS_DIR` set → expected path uses the override root.
  - Candidate list caps at 3 and includes rejection reasons.
  - Override reason set → output confirms override path.
  - Subagent manifests present → guard passes with unchanged output.
  - `delegate.spawn` async path returns within tool-call timeout and child run continues to completion.
  - Delegation token persisted before return; question queue works for long-running child.
  - Context object access helpers return deterministic chunks; runner can process large prompts via pointers.
  - Subcalls are scheduled by runner with pointer inputs, not authored as O(N) tool calls.
  - Archive stubs only land when doc-archives payloads exist (or fail with actionable error).
  - Diff budget override recorded (or PR split) so Core Lane passes.
- Tooling / Automation:
  - Snapshot tests for deterministic diagnostics formatting.
  - Use temp dirs with `CODEX_ORCHESTRATOR_ROOT` / `CODEX_ORCHESTRATOR_RUNS_DIR` to control fixtures (add a dedicated spec under `tests/` during implementation).
- Rollback Plan:
  - Revert `scripts/delegation-guard.mjs` to prior output and remove SOP note if needed.

## Documentation & Evidence
- Linked PRD: `docs/PRD-delegation-rlm-quick-wins.md`
- Run Manifest Link: (docs-review run recorded in task checklist)
- Metrics / State Snapshots: `.runs/0951-delegation-rlm-quick-wins/metrics.json`, `out/0951-delegation-rlm-quick-wins/state.json`

## Open Questions
- Should we add a `--verbose` flag or `DEBUG=1` path for expanded context?
- Should automation always set `DIFF_BUDGET_OVERRIDE_REASON` for archive batches, or split PRs by category to stay under budget?

## Appendix — Example Output Schema (draft)

```
Delegation guard: issues detected
 - Missing: MCP_RUNNER_TASK_ID
 - Expected manifests: <runs-root>/<task-id>-*/cli/<run-id>/manifest.json
 - Candidates (first 3): <path> (reason: <why>)
 - Fix: export MCP_RUNNER_TASK_ID=<task-id> and run a subagent with <task-id>-<stream>
 - Override: set DELEGATION_GUARD_OVERRIDE_REASON="..." (if delegation is impossible)
```

## Approvals
- Engineering: Pending
- Reviewer: Pending
