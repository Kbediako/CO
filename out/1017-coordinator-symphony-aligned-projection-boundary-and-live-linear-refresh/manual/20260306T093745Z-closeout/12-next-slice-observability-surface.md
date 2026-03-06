# Next Slice Recommendation

- Real upstream Symphony keeps observability controllers thin and delegates snapshot-to-payload shaping to a presenter layer, while tracker-specific behavior stays behind the adapter boundary.
- `1017` moved CO in that direction by extracting selected-run projection, but `controlServer.ts` still owns too much `/api/v1` semantics, error shaping, and UI dataset assembly.
- The best next slice is a CO-specific observability-surface module that owns `/api/v1/state`, `/api/v1/:issue_identifier`, `/api/v1/refresh`, and `/ui/data.json` response shaping from a narrow snapshot-plus-advisory interface.
- `controlServer.ts` should then retain only routing, auth, webhook intake, SSE/client management, and control mutations.
- This keeps CO’s harder authority model intact while making future Telegram/downstream-user surfaces reuse a stable presenter-style layer.
