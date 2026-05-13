# 1033 Deliberation

- Real Symphony’s compatibility controller/presenter path consumes a runtime snapshot whose `running` and `retrying` collections are first-class inputs rather than a selected-run derivative.
- `1032` moved CO’s core compatibility routes onto a collection-backed projection, but that projection still derives from `readSelectedRunSnapshot()`.
- The smallest next Symphony-aligned move is therefore:
  - keep the selected-run seam for UI and Telegram,
  - introduce a compatibility-oriented runtime snapshot source for the core compatibility API,
  - keep the projection-owned route surface from `1032`,
  - avoid broadening into real multi-run aggregation or authority changes.
- A broader refactor is not justified yet because the current remaining gap is source ownership, not controller routing or transport behavior.
