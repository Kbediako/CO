# ACTION_PLAN - Coordinator Symphony-Aligned Control Server Seeded Runtime Assembly Extraction

## Steps

1. Register `1084` docs-first from the `1083` next-slice note and the bounded seeded-runtime scout.
2. Extract seeded store/runtime/persist/request-context assembly from `ControlServer.start()` into one control-local helper.
3. Keep token generation, JSON seed loading, server/request shell creation, bootstrap assembly, and startup sequencing in `ControlServer.start()`.
4. Add focused regressions for missing-`rlm` default injection, live persist closures, and externally observable runtime/request-context wiring.
5. Run the validation bundle, sync mirrors, and queue the next bounded Symphony-aligned seam.
