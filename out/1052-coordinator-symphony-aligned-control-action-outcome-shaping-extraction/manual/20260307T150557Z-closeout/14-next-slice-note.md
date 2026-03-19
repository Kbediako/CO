# 1052 Next Slice Note

- The next bounded Symphony-aligned seam is no longer response shaping. The largest remaining `/control/action` inline surface is the cancel-confirmation execution branch plus the mutation/persist/publish orchestration that still lives inside `controlServer.ts`.
- The smallest useful follow-on is a dedicated execution helper that:
  - validates and resolves approved cancel confirmations
  - binds confirmed transport scope and reruns transport preflight/replay checks
  - returns the data needed for `controlStore.updateAction(...)`, persistence, and publish/audit steps
- `controlServer.ts` should continue to own:
  - route ordering and auth/CSRF gating
  - raw HTTP reads/writes
  - confirmation persistence side effects
  - transport nonce consume / rollback
  - final control mutation, runtime publish, and audit emission
