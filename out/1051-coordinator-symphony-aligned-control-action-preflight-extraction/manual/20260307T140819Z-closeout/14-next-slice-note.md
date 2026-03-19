# 1051 Next Slice Note

- Recommended next bounded seam: extract the post-preflight `/control/action` confirmation-versus-apply response shaping into a dedicated helper while keeping nonce consumption, control-state mutation, persistence ordering, runtime publish, and audit emission in `controlServer.ts`.
- Why this is next:
  - After `1051`, the largest remaining inline `/control/action` surface is no longer parsing/validation; it is the branch that decides whether to issue a confirmation challenge or apply/replay the already-validated mutation and shape the resulting payload.
  - Pulling that response-shaping seam outward would continue the Symphony-aligned decomposition without weakening CO’s harder authority boundary.
- Constraints for the follow-on slice:
  - Keep final authority-bearing mutation, persistence rollback, runtime publish, and audit emission in `controlServer.ts`.
  - Preserve confirmation-required, replay, and applied response contracts exactly.
  - Treat the duplicated transport replay lookup between `controlActionPreflight.ts` and `controlState.ts` as a separate state-layer follow-up unless it becomes inseparable from the response-shaping seam.
