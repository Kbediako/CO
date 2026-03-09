# ACTION_PLAN - Coordinator Symphony-Aligned Authenticated Route Handoff Assembly Extraction

1. Confirm the remaining authenticated-route handoff assembly still local to `controlServer.ts` and keep authenticated admission plus fallback `404` ownership out of scope.
2. Extract the bounded authenticated-route handoff helper that owns question-child adapter creation, task-id derivation, and the control-specific controller context assembly.
3. Update `controlServer.ts` to delegate authenticated-route handoff assembly without changing branch order or authority boundaries.
4. Add focused tests for the extracted handoff seam and preserve route-level authenticated behavior coverage.
5. Run the full validation lane and sync task/docs mirrors.
