# 1032 Deliberation

- Real Symphony’s core observability contract is collection-backed:
  - `router.ex` exposes `/api/v1/state`, `/api/v1/refresh`, and `/api/v1/:issue_identifier`
  - `presenter.ex` builds `running` and `retrying` collections, then resolves issue detail from those collections
- CO now has the correct route split after `1030` and `1031`, but the compatibility state/issue code still reads `snapshot.selected` directly and synthesizes collections inline.
- The smallest higher-value next slice is therefore:
  - keep the selected-run runtime seam for UI/Telegram,
  - add a collection-backed compatibility projection derived from that current runtime snapshot,
  - move the compatibility state/issue readers onto that projection,
  - leave `/api/v1/dispatch` and broader autonomy work untouched.
- A broader refactor is not justified yet because the current gap is read-model shape, not controller routing or authority policy.
