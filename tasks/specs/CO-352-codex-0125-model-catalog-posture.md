---
id: 20260424-linear-f4469614-cfdf-49a6-a7ff-366f58229816
title: CO-352 Codex 0.125 Model-Catalog Posture
status: in_progress
owner: Codex
created: 2026-04-24
last_review: 2026-06-17
review_cadence_days: 30
risk_level: high
related_prd: docs/PRD-codex-0125-model-catalog-posture.md
related_action_plan: docs/ACTION_PLAN-codex-0125-model-catalog-posture.md
related_tasks:
  - tasks/tasks-linear-f4469614-cfdf-49a6-a7ff-366f58229816.md
review_notes:
  - 2026-06-17: CO-579 pre-expiry review kept this spec active-current; no verified terminal/archive evidence was established in this stream, CO-579 is the live non-terminal docs-freshness owner, and docs/spec gates remain unchanged.
  - 2026-04-24: Docs-first child lane created the CO-352 packet from the parent run source anchor and the lane prompt. Scope is docs-only; parent owns current canary evidence, Linear state, implementation, PR lifecycle, and final reconciliation.
  - 2026-04-24: Issue-quality review approves CO-352 as a posture/alignment lane, not a blind model-catalog or default bump. Required evidence includes top-level, delegated/provider-worker, standalone review, cloud/fallback, and downstream/no-network explorer_fast checks.
  - 2026-05-18: CO-522 active-spec audit found 4 unchecked task checklist items, so this spec remains active and was reviewed for current lifecycle ownership rather than archived. Evidence: `out/linear-b642e879-ba50-45ef-b0d9-b059afa9e932-recovery/spec-preexpiry-local-classification.json`.
---

# Technical Specification

## Context
CO-352 validates Codex CLI `0.125` model-catalog posture and adopts `gpt-5.5` / `xhigh` as the current CO-local ChatGPT-auth/appserver posture where the evidence passed. CO-341 remains the boundary baseline for unproven surfaces: cloud execution, release-facing pins, API portability, and downstream/no-network catalog behavior still need their own evidence before moving.

The parent source anchor for this docs packet is `ctx:sha256:3cf28c7e9319e4f963d4249bf02c3325281966ef0e16dd3c1954bb03cce49ca2#chunk:c000001`, with manifest `.runs/linear-f4469614-cfdf-49a6-a7ff-366f58229816-docs-packet/cli/2026-04-24T20-45-55-787Z-73fa9234/manifest.json`.

## Requirements
1. Capture source evidence for the exact Codex CLI `0.125` candidate under review: package version, release notes or official docs, repo pins, and any parent canary manifest paths.
2. Capture local top-level posture with `which codex`, `codex --version`, `codex login status`, `codex debug models`, `codex debug models --bundled`, and an explicit `codex exec` model/reasoning smoke where safe.
3. Compare model-catalog surfaces instead of collapsing them: live debug catalog, bundled debug catalog, app-server `model/list`, generated template/default config, package smoke install, and downstream no-network behavior.
4. Probe or record blockers for delegated/provider-worker execution, including `provider-linear-worker`, `codex exec`, `codex exec resume`, app-server/runtime mode, and any resumability impact.
5. Probe standalone review posture, including `codex review`, review wrapper model selection, `review_model`, and whether review evidence supports `gpt-5.5` or requires fallback.
6. Run cloud canary when environment is available; otherwise record exact fallback evidence such as `missing_environment` without treating the fallback as cloud model support.
7. Verify downstream/no-network `explorer_fast` behavior remains valid and file/codebase-search-only; do not replace `gpt-5.3-codex-spark` without targeted no-network package evidence.
8. Adopt `gpt-5.5` / `xhigh` for validated CO-local ChatGPT-auth top-level, delegated, review, and appserver surfaces; keep `gpt-5.4` / `xhigh` only as an explicit fallback when access, provider, cloud, or downstream evidence is missing.

## Issue-Shaping Contract
- User-request translation carried forward: validate `0.125` model-catalog posture before changing defaults; debug catalog visibility alone is not adoption proof.
- Protected terms / exact artifact and surface names: `CO-352`, Codex CLI `0.125`, `@openai/codex`, `codex debug models`, `codex debug models --bundled`, `codex login status`, `codex exec`, `codex exec resume`, `codex review`, `review_model`, `app-server model/list`, `provider-linear-worker`, `cloud-canary`, `CODEX_CLOUD_ENV_ID`, `missing_environment`, `gpt-5.5`, `gpt-5.4`, `model_reasoning_effort = "xhigh"`, legacy compatibility marker `local_model_opt_in = "gpt-5.5"`, `explorer_fast`, `gpt-5.3-codex-spark`, `pack:smoke`, no-network downstream smoke.
- Nearby wrong interpretations to reject: blind default promotion from `codex debug models`, conflating top-level ChatGPT-auth access with provider/review/cloud/downstream portability, treating live and bundled catalogs as identical without comparison, weakening `explorer_fast`, or mutating user-level config.
- Explicit non-goals carried forward: no implementation in the docs child lane, no Linear mutation, no PR lifecycle work, no broad marketplace/cloud/provider redesign, and no unrelated stale-doc cleanup.

## Parity / Alignment Matrix
- Pre-CO-352 baseline: CO-341 promoted `0.124.0` command/workflow surfaces with evidence, kept packaged/generated defaults on `gpt-5.4` / `xhigh`, allowed legacy-marker local ChatGPT-auth `gpt-5.5` use, and held Cloud/API direct model choice.
- Reference truth: parent CO-352 canaries must establish exact `0.125` source, live catalog, bundled catalog, app-server, provider, review, cloud/fallback, and downstream/no-network facts.
- Target truth: classify every model-catalog surface as adopt, fallback, blocker, or no-op with dated artifact evidence; adopt `gpt-5.5` / `xhigh` for validated CO-local surfaces and keep blockers scoped to the surfaces they actually affect.
- Explicitly out-of-scope differences: release publication, broad plugin marketplace redesign, user-level Codex config mutation, unrelated active issue cleanup, and role-policy changes beyond `explorer_fast` validation.

## Readiness Gate
- Not done if:
  - `gpt-5.5` is recommended solely because `codex debug models` lists it, without top-level/delegated/review/runtime evidence.
  - Any required evidence class is missing or hidden behind narrative summary.
  - Cloud fallback evidence is worded as cloud model support.
  - The exact cloud environment blocker is used as generic caution against local ChatGPT-auth/appserver `gpt-5.5` posture.
  - Downstream/no-network `explorer_fast` behavior is untested or weakened.
  - `tasks/index.json` does not register this TECH_SPEC through `items[]`.
- Pre-implementation issue-quality review evidence: this PRD, TECH_SPEC, ACTION_PLAN, and registry row preserve protected terms, wrong interpretations, non-goals, Not Done If, and the current/reference/target parity matrix before implementation.
- Safeguard ownership split: child lane owns docs packet only; parent owns canaries, final issue state, code/config edits, reviews, and PR lifecycle.

## Technical Requirements
- Functional requirements:
  - Build a model-catalog comparison table from parent evidence.
  - Adopt the CO-local `gpt-5.5` / `xhigh` posture where evidence passed, while preserving CO-341 fallback behavior for unproven cloud/API/downstream surfaces.
  - Require explicit artifact paths for every pass, fallback, and blocker.
  - Keep `explorer_fast` constrained to file/codebase search unless a separate validated issue changes that policy.
- Non-functional requirements:
  - Evidence must be dated, reproducible, and tied to the exact CLI/package candidate.
  - Changes after this docs phase must be narrow and reversible.
  - Downstream package behavior must not require live network catalog access unless documented as an explicit dependency.
- Interfaces / contracts:
  - Codex CLI command surfaces: `debug models`, `exec`, `exec resume`, `review`, `login status`.
  - Orchestrator surfaces: provider-linear-worker, app-server/runtime mode, cloud-canary, pack smoke, docs/defaults generation, review wrapper.
  - Role policy: `explorer_fast` / `gpt-5.3-codex-spark` remains file/codebase-search-only.

## Architecture & Data
- Architecture / design adjustments: no architecture change is required for the docs packet. Implementation must be evidence-led and can be a no-op for surfaces that remain fallback/blocker.
- Data model changes / migrations: none planned.
- External dependencies / integrations: Codex CLI, OpenAI Codex official docs or release sources, npm package metadata, app-server model list, Codex Cloud environment, provider-linear-worker, downstream package smoke.

## Validation Plan
- Docs-child checks:
  - `node -e "JSON.parse(require('fs').readFileSync('tasks/index.json', 'utf8'))"`
  - `git diff --check -- docs/PRD-codex-0125-model-catalog-posture.md tasks/specs/CO-352-codex-0125-model-catalog-posture.md docs/ACTION_PLAN-codex-0125-model-catalog-posture.md tasks/index.json`
- Parent implementation checks:
  - docs-review before implementation.
  - Focused model-catalog and defaults tests when defaults/templates are touched.
  - Provider-worker, standalone-review, cloud/fallback, and downstream/no-network smoke artifacts.
  - Full validation floor and `pack:smoke` if downstream package, CLI, review-wrapper, skills, defaults, or template surfaces change.
- Rollout verification:
  - Parent records adopt/fallback/no-op buckets with manifest paths before PR handoff.
  - If a required gate fails, hold only that surface and record the blocker instead of downgrading validated local posture.
- Monitoring / alerts:
  - Follow-up issue required for live-vs-bundled catalog disagreement, stale legacy-marker cleanup, or no-network downstream regressions not fixed in CO-352.

## Open Questions
- What exact `0.125` package/version/source snapshot is the parent lane validating?
- Does `0.125` change only catalog listing, or does it change generated defaults, review model selection, provider-worker model resolution, or app-server model-list defaults?
- Are cloud canary prerequisites available, or is `missing_environment` the expected fallback contract for this run?

## Approvals
- Docs packet: prepared by bounded same-issue child lane on 2026-04-24.
- Parent review: pending.
