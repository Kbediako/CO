# Provider Examples

These files are seeded by `codex-orchestrator init codex`.

- `provider.env.example` is the once-per-machine or secret-backed env contract.
- `control.example.json` is the provider policy example for `dispatch_pilot` and `transport_mutating_controls`.

Recommended flow:

1. Copy values from `provider.env.example` into your real secret or env management system.
2. Copy the `feature_toggles` blocks you need from `control.example.json` into your run-local control seed.
3. Verify with `codex-orchestrator doctor --format json`.
4. Start the host with `codex-orchestrator control-host --format json` and keep it running in a dedicated terminal during provider smoke.
