# PRD - CO: Re-audit Codex CLI 0.123.0 posture and correct marketplace command-surface assumptions

## Summary
- Problem Statement: CO's documented Codex posture still holds the active target at `0.118.0` and the latest audited candidate at `0.122.0`, while the locally installed CLI is now Codex CLI `0.123.0`. More importantly, CO still treats post-`0.121.0` marketplace support as missing when the current truth is a command relocation from `codex marketplace add` to `codex plugin marketplace add`.
- Desired Outcome: produce a bounded `0.123.0` posture audit for CO, fix the stale marketplace command-surface assumption in pack-smoke/docs/workflow rationale, and keep or change the release-facing workflow pins only with current evidence.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): treat CO-337 as a posture-and-command-surface correction lane. The work must verify official `rust-v0.123.0` release facts, local and versioned command surfaces for `0.121.0` / `0.122.0` / `0.123.0`, update CO's marketplace capability detection/messages, and re-decide the release-facing pin policy without weakening `pack:smoke`, cloud-canary, or the active-target evidence gates.
- Success criteria / acceptance:
  - official `rust-v0.123.0` release facts and local `0.123.0` help output are captured with timestamps
  - marketplace command truth is recorded for `0.121.0`, `0.122.0`, and `0.123.0`
  - `scripts/pack-smoke.mjs` and `tests/pack-smoke.spec.ts` recognize the supported marketplace surface truthfully
  - user-facing docs/messages no longer instruct `codex marketplace add` unconditionally
  - release-facing workflow pins are kept or changed with explicit evidence after workflow-matched marketplace smoke
  - the `rust-v0.123.0` deltas are classified into adopt / hold / no-op buckets for CO
- Constraints / non-goals: no automatic active-target promotion from `0.118.0` to `0.123.0`; no weakening of required/fallback cloud-canary gates; no provider-worker migration off `codex exec` / `codex exec resume`; no broad auth-profile or Bedrock adoption work unless the audit proves a CO-specific need.

## Intent Checksum
- Exact user wording / phrases to preserve:
  - `CO-337`
  - Codex CLI `0.123.0`
  - Codex CLI `0.122.0`
  - Codex CLI `0.121.0`
  - Codex CLI `0.118.0`
  - `rust-v0.123.0`
  - `codex plugin marketplace add`
  - `codex marketplace add`
- Protected terms / exact artifact and surface names:
  - `pack:smoke`
  - `scripts/pack-smoke.mjs`
  - `tests/pack-smoke.spec.ts`
  - `docs/guides/codex-version-policy.md`
  - `README.md`
  - `docs/public/downstream-setup.md`
  - `plugins/codex-orchestrator/launcher.mjs`
  - `.github/workflows/core-lane.yml`
  - `.github/workflows/release.yml`
  - `.github/workflows/pack-smoke-backstop.yml`
  - `.github/workflows/cloud-canary.yml`
  - `node scripts/runtime-mode-canary.mjs`
  - `CODEX_CLOUD_ENV_ID`
  - `remote_sandbox_config`
- Nearby wrong interpretations to reject:
  - treating missing top-level `codex marketplace add` as proof that `0.122.0+` has no marketplace-compatible surface
  - blindly promoting active target from `0.118.0` to `0.123.0`
  - weakening `pack:smoke` fail-closed behavior or cloud-canary requirements to make newer versions look green
  - broadening into provider-worker app-server migration, remote-control redesign, or general plugin UX work
  - reopening the CO-196 marketplace packaging implementation instead of correcting the command-surface and workflow-policy assumption

## Parity / Alignment Matrix

| Surface | Current truth | Reference truth | Target truth |
| -- | -- | -- | -- |
| Active posture | CO still documents `0.118.0` as the active target. | Local workspace and official upstream stable are now at `0.123.0`, but promotion remains evidence-gated. | `0.118.0` stays active unless fresh runtime/cloud evidence justifies change. |
| Marketplace capability | CO docs/tests/workflow rationale still imply post-`0.121.0` Codex lacks a marketplace surface. | `0.121.0` supports both paths; `0.122.0` and `0.123.0` support `codex plugin marketplace add` and reject top-level `codex marketplace add`. | CO capability detection, docs, and workflow rationale describe the relocation truthfully. |
| Release-facing pins | `.github/workflows/core-lane.yml`, `.github/workflows/release.yml`, and `.github/workflows/pack-smoke-backstop.yml` still install `@openai/codex@0.121.0` because of the stale marketplace assumption. | Workflow pins should follow the corrected command-surface truth plus workflow-matched smoke evidence. | Pins are kept or changed only after corrected `pack:smoke` coverage and explicit policy rationale. |


Explicitly out-of-scope differences: automatic posture promotion, cloud-gate weakening, provider-worker runtime redesign, and broad auth/profile adoption work.

## Not Done If
- CO docs still tell operators to run `codex marketplace add ...` against current `0.123.0`.
- `docs/guides/codex-version-policy.md` still states or implies that `0.122.0+` lacks a marketplace surface.
- `scripts/pack-smoke.mjs` and `tests/pack-smoke.spec.ts` still fail closed for the wrong command-path reason.
- Release-facing workflow pins remain on `0.121.0` without fresh corrected-surface evidence.

## Goals
- Capture the current official and local `0.123.0` evidence.
- Correct the marketplace command-surface assumption across code, tests, docs, and workflow rationale.
- Re-classify the `rust-v0.123.0` deltas for CO.
- Preserve the existing active-target and cloud-evidence guardrails unless fresh evidence changes them.

## Non-Goals
- No automatic active-target promotion.
- No cloud-canary or fallback-gate weakening.
- No provider-worker migration off the current exec seam.
- No broad Bedrock rollout or auth-profile redesign.

## Stakeholders
- Product: CO maintainers who need a truthful current Codex posture and downstream install story.
- Engineering: CO pack-smoke, workflow, review-wrapper, runtime-mode, and cloud-canary maintainers.
- Design: Not applicable.

## Metrics & Guardrails
- Primary Success Metrics: corrected marketplace capability detection/messages land with matching tests and workflow rationale; official/local/versioned evidence is recorded; the final pin decision is explicit.
- Guardrails / Error Budgets: zero weakening of `pack:smoke` fail-closed behavior, zero weakening of cloud canary requirements, and zero blind version-string promotion.

## User Experience
- Personas:
  - CO maintainer deciding whether `0.123.0` is candidate-only or promotable.
  - Release/workflow maintainer deciding whether downstream-smoke pins should stay on `0.121.0`.
  - Operator following README/downstream setup instructions on a current CLI.
- User Journeys:
  - Maintainer sees the current/reference/target posture plus corrected marketplace truth in one packet.
  - Operator uses a docs path that works on current Codex CLIs.
  - Reviewer can audit why the release-facing pins did or did not change.

## Technical Considerations
- Architectural Notes: parent implementation is expected to touch docs-first packet files, `scripts/pack-smoke.mjs`, `tests/pack-smoke.spec.ts`, workflow pin surfaces, and the delegated docs/message files. The key behavior change is command-surface detection and invocation, not a packaging redesign.
- Dependencies / Integrations: official `openai/codex` release surface for `rust-v0.123.0`, local `codex` CLI, versioned `npx @openai/codex` repros for `0.121.0` / `0.122.0` / `0.123.0`, `docs/guides/codex-version-policy.md`, workflow files, and `node scripts/runtime-mode-canary.mjs`.

## Open Questions
- After correcting marketplace detection and rerunning workflow-matched smoke on `0.122.0` or `0.123.0`, do release-facing pins still need to stay on `0.121.0` for some other reason?
- Are any `rust-v0.123.0` deltas besides marketplace relocation material enough to require follow-up work instead of adopt/hold/no-op classification only?

## Approvals
- Product: issue accepted via CO-337.
- Engineering: pending parent docs-review / implementation / validation.
- Design: Not applicable.
