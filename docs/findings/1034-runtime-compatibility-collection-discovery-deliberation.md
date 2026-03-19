# 1034 Deliberation

- Real Symphony's compatibility controller/presenter path consumes a runtime snapshot whose `running` and `retrying` collections are first-class inputs from orchestrator state.
- `1033` gave CO a dedicated compatibility source seam, but that source still represents at most one selected issue and an optional single running entry.
- The smallest higher-value next slice is therefore:
  - keep the selected-run seam for UI and Telegram,
  - add a bounded runtime discovery layer for compatibility `running` and `retrying`,
  - preserve the current projection-owned compatibility route surface,
  - leave `/api/v1/dispatch`, Telegram control authority, and Linear advisory policy untouched.
- A broader refactor is not justified yet because the current remaining gap is collection population, not control authority or scheduler ownership.
