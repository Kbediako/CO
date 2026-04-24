# PRD - CO-352 Codex 0.125 Model-Catalog Posture

## Summary
Codex CLI `0.125` may expose updated model-catalog behavior, but CO must validate that posture before changing any shipped defaults. CO-352 keeps the CO-341 split intact: local ChatGPT-auth `gpt-5.5` evidence can justify explicit marker-backed local opt-ins, while packaged/generated defaults remain portable until top-level, delegated/provider-worker, standalone review, cloud/fallback, and downstream/no-network evidence all support a broader change.

## User Request Translation
- Prepare the docs-first packet for validating Codex CLI `0.125` model-catalog posture before implementation or default changes.
- Treat `codex debug models` as one catalog signal, not as sufficient proof that `gpt-5.5` is portable across downstream, provider-worker, review, cloud, or no-network flows.
- Require evidence across top-level Codex, delegated/provider-worker execution, standalone review, cloud or exact fallback blocker, and downstream/no-network `explorer_fast` behavior before any posture promotion.
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
| Packaged/generated model defaults | CO-341 kept portable shipped defaults on `gpt-5.4` / `xhigh` while allowing marker-backed local ChatGPT-auth `gpt-5.5` opt-ins after proof. | Codex CLI `0.125` release, npm, bundled catalog, live catalog, and official Codex model guidance as captured by the parent canary lane. | Hold defaults unless all portability gates pass and the parent makes an explicit default-change decision. | Blind default bumps from catalog listing alone. |
| Local top-level posture | CO-341 proved local `gpt-5.5` / `xhigh` on `0.124.0` after earlier `0.123.0` access failures. | `0.125` `which codex`, `codex --version`, auth state, `codex debug models`, `codex debug models --bundled`, and explicit `codex exec` smoke. | Record pass/blocker evidence with commands, exits, and artifacts. | Editing user-level config as part of the docs lane. |
| Provider, review, and cloud posture | CO requires separate provider-worker, review, and cloud/fallback evidence before promoting model posture. | Provider-worker `codex exec` / `codex exec resume`, standalone review model behavior, `app-server model/list`, cloud canary, and exact fallback blocker such as `missing_environment`. | Promote only validated surfaces; otherwise keep hold buckets with blocker evidence. | Claiming Cloud/API portability from local ChatGPT-auth evidence. |
| Downstream/no-network `explorer_fast` | `explorer_fast` is the `gpt-5.3-codex-spark` file/codebase-search-only exception. | Packaged downstream install behavior without live network catalog assumptions. | Preserve `explorer_fast` behavior unless focused downstream/no-network smoke proves a safe alternative. | Broad role redesign or using spark for synthesis, planning, implementation, or review. |

## Not Done If
- Shipped or generated defaults are changed solely because `codex debug models` lists `gpt-5.5`.
- The packet omits any required evidence class: top-level, delegated/provider-worker, standalone review, cloud/fallback, or downstream/no-network `explorer_fast`.
- Live, bundled, app-server, and downstream catalog surfaces are not compared or classified.
- Cloud/API or downstream portability is asserted without direct evidence or an exact blocker.
- `tasks/index.json` does not link this TECH_SPEC through the canonical `items[]` registry.

## Goals
- Establish CO-352 as a high-risk, evidence-gated posture lane for Codex CLI `0.125` model-catalog validation.
- Give the parent lane a clear acceptance checklist before any model default, template, or generated-config change.
- Preserve the CO-341 safety split until the parent can reconcile current `0.125` canary evidence.

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
- A default change requires affirmative evidence from every required class, not only the model catalog.
- Hold decisions are acceptable when evidence is missing or blocked, provided the blocker is explicit and dated.
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
