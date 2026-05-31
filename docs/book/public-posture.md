# Public Posture

## Stable Compatibility Vs Local Posture

CO's current local ChatGPT-auth/appserver posture is Codex CLI `0.135.0` with `gpt-5.5` / `xhigh` when live access smoke passes. CO's current release-facing package/downstream-smoke compatibility target is Codex CLI `0.125.0`, and cloud execution remains separately gated by the canonical version policy.

Newer stable and prerelease Codex CLI builds remain evidence-gated. The canonical policy is [docs/guides/codex-version-policy.md](../guides/codex-version-policy.md).

## Current Model / Runtime Posture

- Current model posture: `gpt-5.5` / `xhigh` when available in ChatGPT-auth Codex sessions.
- Portable packaged/generated defaults keep `gpt-5.4` / `xhigh` as fallback values when `gpt-5.5`, API, or cloud portability is unavailable.
- Local `gpt-5.5` use is the current CO posture after live access smoke; legacy marker metadata is ignored for posture decisions.
- `explorer_fast` remains the explicit `gpt-5.3-codex-spark` exception for file/codebase search only.
- Local appserver remains the expected default runtime path.
- App-server remains the normal local runtime path and provider-worker control authority when selected by the runtime provider; `codex exec` / `codex exec resume` are preserved as break-glass or legacy CLI fallback paths.
- Permission posture uses explicit profiles and trust flows. Built-in profile ids are `:read-only`, `:workspace`, and `:danger-no-sandbox`; `--full-auto` is not normal current guidance.

## Release-Facing Holds

- Release-facing downstream-smoke workflows intentionally hold `@openai/codex@0.125.0`.
- `cloud-canary` intentionally holds `@openai/codex@0.124.0`.
- Current local `0.135.0` evidence does not promote cloud execution or release-facing workflow pins while the configured cloud environment blocker remains unresolved.

## Evidence Gates

Local model-posture updates must record:

1. Local appserver path success on the candidate Codex CLI and model posture.
2. Delegated/review surface verification under the actual auth provider.
3. `node scripts/runtime-mode-canary.mjs` success.
4. No P0/P1 regression versus the current stable baseline.

Cloud execution or release-facing promotion additionally requires:

1. Required cloud canary success with configured cloud env.
2. Cloud fallback contract success.

## Marketplace Split

Marketplace/plugin support is additive. npm remains the supported baseline install path. Release-facing smoke lanes can stay pinned to a marketplace-capable Codex CLI while newer candidates are audited separately for cloud/runtime posture.
