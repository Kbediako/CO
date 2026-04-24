# Public Posture

## Current Compatibility Target

CO currently uses Codex CLI `0.125.0` for validated local ChatGPT-auth/appserver posture. Cloud execution and release-facing pins remain separately gated by the canonical version policy.

Newer stable and prerelease Codex CLI builds remain evidence-gated. The canonical policy is [docs/guides/codex-version-policy.md](../guides/codex-version-policy.md).

## Current Model / Runtime Posture

- Current model posture: `gpt-5.5` / `xhigh` when available in ChatGPT-auth Codex sessions.
- Portable packaged/generated defaults keep `gpt-5.4` / `xhigh` as fallback values when `gpt-5.5`, API, or cloud portability is unavailable.
- Marker-backed local `gpt-5.5` use is the preferred CO posture after live access smoke plus `[codex_orchestrator] local_model_opt_in = "gpt-5.5"`.
- `explorer_fast` remains the explicit `gpt-5.3-codex-spark` exception for file/codebase search only.
- Local appserver remains the expected default runtime path.
- Provider workers keep the current `codex exec` / `codex exec resume` supervision seam until a separate governed lane promotes a replacement.

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
