# 1236 Deliberation: Control Bootstrap And Telegram Oversight Contract Reassessment

- Risk stays below the full-deliberation threshold because the candidate continuation is read-only and meant to prevent a synthetic extraction.
- The strongest bounded scout result after the `1235` freeze pointed to the bootstrap and Telegram oversight contract as the next broader subsystem worth reassessing.
- The main reason to look here next is that control auth and endpoint persistence, expiry startup, lazy oversight-facade wiring, bridge replacement, and best-effort bridge activation still meet across a tight bootstrap boundary.
- The main regression risk is bootstrap-order drift: if a future extraction is mis-scoped, auth or endpoint files could be stale when the bridge starts, expiry tracking could lag bridge activation, or bridge subscriptions could leak across restart or close flows.
