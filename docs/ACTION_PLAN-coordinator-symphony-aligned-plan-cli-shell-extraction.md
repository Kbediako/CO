# ACTION_PLAN: Coordinator Symphony-Aligned Plan CLI Shell Extraction

1. Reinspect `handlePlan(...)` and the handoff into `orchestrator.plan(...)` to confirm the exact shell boundary.
2. Extract the bounded launch/output shell into a dedicated helper while leaving binary parse/help ownership local.
3. Add focused helper and CLI-surface parity for the extracted `plan` behavior.
4. Run the standard lane validations and record any honest carry-forwards in the closeout packet.
