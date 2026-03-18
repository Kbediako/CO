# ACTION_PLAN: Coordinator Symphony-Aligned RLM CLI Request Shell Extraction

## Steps

1. Extract the current RLM request shaping from `handleRlm(...)` into a focused request-shell helper.
2. Preserve launch and completion ownership in the existing RLM shell helpers.
3. Add focused helper parity and rerun the required validation bundle.

## Validation

- targeted RLM helper tests
- targeted `rlm` CLI surface tests
- full required validation bundle for downstream-facing CLI changes
