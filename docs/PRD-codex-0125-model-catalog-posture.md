# PRD - CO-352 Codex 0.125 Model-Catalog Posture

## Summary
Codex CLI `0.125` exposes updated model-catalog behavior, and CO-352 validates it with enough local evidence to adopt `gpt-5.5` / `xhigh` as the current CO-local ChatGPT-auth/appserver posture. The lane keeps the remaining boundaries explicit: cloud execution and release-facing pins stay blocked by the exact configured-environment failure, and `explorer_fast` stays unchanged because live and bundled catalogs diverge.

## User Request Translation
- Prepare the docs-first packet for validating Codex CLI `0.125` model-catalog posture before implementation or default changes.
- Treat `codex debug models` as one catalog signal, not as sufficient proof by itself; use it with top-level, delegated/provider-worker, standalone review, runtime, cloud/fallback, and downstream/no-network evidence.
- After user correction, re-scope the outcome from a broad hold to adopting `gpt-5.5` / `xhigh` as the CO-local ChatGPT-auth/appserver posture unless a concrete blocker applies to that surface.
- Record the cloud blocker exactly as cloud/release-pin scoped instead of using it as generic caution against the local model posture.
- Preserve this child lane's scope: docs packet plus `tasks/index.json`; parent owns Linear state, canary evidence, implementation, PR, and final reconciliation.

## Intent Checksum
- Exact user wording / phrases to preserve:
  - "Codex 0.125 model-catalog posture validation"
  - "do not recommend changing shipped defaults solely because `codex debug models` lists `gpt-5.5`"
  - "top-level, delegated/provider-worker, standalone review, cloud/fallback, and downstream/no-network `explorer_fast` evidence"
- Protected terms / exact artifact and surface names:
  - `CO-352`
  - Codex CLI `0.125`
  - `@openai/codex`
  - `codex debug models`
  - `codex debug models --bundled`
  - `codex login status`
  - `codex exec`
  - `codex exec resume`
  - `codex review`
  - `review_model`
  - `app-server model/list`
  - `provider-linear-worker`
  - `cloud-canary`
  - `CODEX_CLOUD_ENV_ID`
  - `missing_environment`
  - `gpt-5.5`
  - `gpt-5.4`
  - `model_reasoning_effort = "xhigh"`
  - `local_model_opt_in = "gpt-5.5"`
  - `explorer_fast`
  - `gpt-5.3-codex-spark`
  - `pack:smoke`
  - no-network downstream smoke
- Nearby wrong interpretations to reject:
  - Promoting shipped/generated defaults because a live or bundled debug catalog lists `gpt-5.5`.
  - Treating top-level ChatGPT-auth success as provider-worker, review-model, cloud, API-key, or downstream no-network success.
  - Treating `app-server model/list`, `codex debug models`, or `codex debug models --bundled` as interchangeable without recording disagreements.
  - Widening this lane into user-level `~/.codex` mutation, release publishing, marketplace redesign, or unrelated stale-doc cleanup.
  - Weakening `explorer_fast` / `gpt-5.3-codex-spark` file/codebase-search-only posture.

## Parity / Alignment Matrix

| Surface | Current truth | Reference truth to capture | Target truth / intended delta | Explicitly out of scope |
| --- | --- | --- | --- | --- |
| CO-local model posture | CO-341 allowed marker-backed local ChatGPT-auth `gpt-5.5` opt-ins while many docs still presented `gpt-5.4` as the conservative posture. | `0.125` `which codex`, `codex --version`, auth state, `codex debug models`, `codex debug models --bundled`, top-level `codex exec`, delegated `codex exec`, appserver/runtime canary, and review-wrapper fallback evidence. | Adopt `gpt-5.5` / `xhigh` as the current CO-local ChatGPT-auth/appserver posture; keep `gpt-5.4` as fallback only when access or provider evidence is missing. | Blind default bumps from catalog listing alone or user-level config mutation in this lane. |
| Cloud and release-facing pins | Required cloud canary is a separate promotion gate. | Required cloud canary plus exact fallback contract. | Keep cloud execution and release-facing pin promotion blocked on the exact `environment ... not found` failure, tracked by `CO-358`. | Treating the cloud blocker as proof that local appserver posture must remain `gpt-5.4`. |
| Provider and review posture | Provider/review surfaces need their own proof before using a newer model. | Provider-worker `codex exec` / `codex exec resume`, standalone review model behavior, `app-server model/list`, and fallback review evidence. | Use `gpt-5.5` on validated ChatGPT-auth local/delegated/review surfaces; fallback to `gpt-5.4` only on concrete access failure. | Claiming Cloud/API portability from local ChatGPT-auth evidence. |
| Downstream/no-network `explorer_fast` | `explorer_fast` is the `gpt-5.3-codex-spark` file/codebase-search-only exception. | Packaged downstream install behavior without live network catalog assumptions. | Preserve `explorer_fast` behavior unless focused downstream/no-network smoke proves a safe alternative. | Broad role redesign or using spark for synthesis, planning, implementation, or review. |

## Not Done If
- Shipped or generated defaults are changed solely because `codex debug models` lists `gpt-5.5`.
- The packet omits any required evidence class: top-level, delegated/provider-worker, standalone review, cloud/fallback, or downstream/no-network `explorer_fast`.
- Live, bundled, app-server, and downstream catalog surfaces are not compared or classified.
- Cloud/API or downstream portability is asserted without direct evidence or an exact blocker.
- The exact cloud blocker is used to keep CO-local ChatGPT-auth/appserver posture on `gpt-5.4` despite passing local/delegated/review/runtime evidence.
- `tasks/index.json` does not link this TECH_SPEC through the canonical `items[]` registry.

## Goals
- Establish CO-352 as the evidence-gated adoption lane for CO-local `gpt-5.5` / `xhigh` posture on Codex CLI `0.125`.
- Give the parent lane a clear acceptance checklist for local adoption, cloud/release blocker handling, and `explorer_fast` preservation.
- Preserve the CO-341 safety split only where evidence is still missing: cloud/API portability, release-facing pins, and downstream/no-network catalog assumptions.

## Non-Goals
- No implementation edits in this child lane.
- No Linear mutation, workpad mutation, PR creation, commit, or merge.
- No user-level Codex config edits.
- No broad release, plugin marketplace, cloud architecture, or provider-control rewrite.
- No weakening of current `explorer_fast` / `gpt-5.3-codex-spark` restrictions.

## Stakeholders
- Product: Linear issue `CO-352`.
- Engineering: Codex Orchestrator maintainers and downstream package consumers.
- Design: Not applicable.

## Metrics & Guardrails
- Each evidence artifact records command, version/auth context, exit status, output path, and pass/blocker classification.
- CO-local model posture can move to `gpt-5.5` / `xhigh` when top-level, delegated/provider-worker, review, and runtime evidence pass.
- Hold decisions are acceptable only for the exact surface with missing or blocked evidence, provided the blocker is explicit and dated.
- Downstream/no-network smoke must prove packaged behavior without relying on a live model catalog fetch.

## Technical Considerations
- Parent source anchor: `ctx:sha256:3cf28c7e9319e4f963d4249bf02c3325281966ef0e16dd3c1954bb03cce49ca2#chunk:c000001`.
- Parent run manifest: `.runs/linear-f4469614-cfdf-49a6-a7ff-366f58229816-docs-packet/cli/2026-04-24T20-45-55-787Z-73fa9234/manifest.json`.
- This child lane read the source payload from the parent issue workspace and writes only the scoped docs packet files plus `tasks/index.json`.

## Open Questions
- Which exact `0.125` package version, release note, and official-doc snapshot will the parent lane designate as source truth?
- Does parent canary evidence show any live-vs-bundled model catalog disagreement that should become a follow-up rather than a default change?

## Approvals
- Product: pending parent-lane acceptance for `CO-352`.
- Engineering: docs-first child lane prepared this packet; parent owns docs-review, implementation gates, standalone review, and final decision.
- Design: Not applicable.
