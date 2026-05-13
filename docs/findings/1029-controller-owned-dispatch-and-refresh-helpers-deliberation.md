# 1029 Deliberation

- `1028` removed the selected-run `/ui`, `/state`, and `/issue` presentation wrappers from `ControlRuntime`.
- The remaining mismatch is dispatch/refresh ownership:
  - runtime still returns compatibility dispatch payloads,
  - runtime still validates refresh envelopes,
  - Telegram dispatch reads still traverse that runtime-owned compatibility presenter seam.
- Real Symphony keeps refresh as controller -> presenter -> orchestrator rather than route semantics living in the runtime/orchestrator cache layer.
- The smallest next slice is therefore:
  - expose transport-neutral dispatch evaluation and refresh invalidation from runtime,
  - move compatibility dispatch/refresh payload handling to controller helpers,
  - retarget Telegram dispatch reads to the same helper,
  - keep payloads and provider policy unchanged.
