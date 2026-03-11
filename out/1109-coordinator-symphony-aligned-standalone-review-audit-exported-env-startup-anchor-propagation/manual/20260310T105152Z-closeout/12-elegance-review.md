# Elegance Review - 1109

- The final shape stays inside the existing `ReviewExecutionState` seam instead of adding a new review wrapper layer or reopening native-review replacement.
- The new complexity is justified and local:
  - one explicit shell-dialect discriminator,
  - one focused bashlike helper for leading bare export assignments,
  - one focused bashlike `export -n` branch in existing export-token handling.
- The implementation deliberately did not keep wrapper-level negative tests for every shell drift case because those were less deterministic than the state-level coverage. Retaining deterministic unit coverage plus bounded wrapper-positive coverage is the smaller reliable shape.
- The blocked-env fallback suppression is a simplification, not extra complexity: once `MANIFEST` is explicitly removed from the allowed path map, raw env-name fallback should not reclassify it as active review evidence.
- No further simplification is recommended inside `1109`; the next simplification opportunity is in the review controller itself, where bounded diff review and open-ended shell experimentation should become separate modes or termination states.
