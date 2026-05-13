# 1028 Deliberation

- `1027` already moved selected-run facts onto `readSelectedRunSnapshot()`.
- The remaining mismatch is transitional wrapper ownership for `/ui`, `/state`, and `/issue`.
- Upstream Symphony keeps runtime facts in the orchestrator and payload shaping in presenter/controller layers.
- The smallest next slice is therefore ownership extraction only:
  - remove `readUiDataset()`, `readCompatibilityState()`, and `readCompatibilityIssue()` from `ControlRuntime`,
  - keep dispatch and refresh primitives unchanged,
  - keep Telegram on the runtime-snapshot path.

