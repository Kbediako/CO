# 1053 Next Slice Note

- The next bounded Symphony-aligned seam is no longer request normalization, outcome shaping, or cancel confirmation resolution. The largest remaining `/control/action` inline surface is the final mutation envelope in `controlServer.ts` after replay and confirmation handling succeed.
- The smallest useful follow-on is a dedicated post-resolution execution helper that:
  - accepts the resolved action, canonical request and intent ids, and optional transport mutation context;
  - performs `controlStore.updateAction(...)` coordination plus replay-entry handoff shaping;
  - returns the data needed for persistence, runtime publish, and audit emission without owning raw HTTP writes.
- `controlServer.ts` should continue to own:
  - route ordering and auth or CSRF gating;
  - raw request and response IO;
  - transport nonce consume and rollback durability;
  - final response writes and audit emission boundaries unless or until a larger control-action controller extraction is explicitly opened as a separate slice.
