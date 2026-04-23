# PRD - CO: Re-audit Codex CLI 0.123.0 Posture and Next-Release Adoption Target

## Summary
- Problem Statement: CO's next-release planning was anchored on the `0.122.0` candidate while upstream published stable Codex CLI `0.123.0` on 2026-04-23. Without a fresh audit, the release posture could either claim latest-stable support without evidence or leave the release plan stale without an explicit hold decision.
- Desired Outcome: Record official `0.123.0` release/npm evidence, compare the `0.123.0` help surface against the `0.122.0` release-facing assumptions, rerun the runtime/cloud evidence gates, and document whether CO promotes `0.123.0` or keeps `0.122.0` as the held release-planning candidate.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): treat CO-322 as the bounded `0.123.0` candidate audit lane, not a release-prep or release-notes parity lane. The work must decide the next-release target truthfully from current upstream/npm/help/canary evidence.
- Success criteria / acceptance: official release/npm timestamps are recorded; `0.123.0` command/help drift is classified; runtime-mode canary and both cloud canary contracts are rerun or blocked with exact evidence; version policy and release blocker story record a single promote/hold decision.
- Constraints / non-goals: do not widen into CO-314 release-notes parity, CO-315 release-skill/docs-check parity, or CO-316 release-prep/ship work. Do not move public posture or release-facing pins to `0.123.0` without clean runtime/cloud evidence gates.

## Intent Checksum
- Exact user wording / phrases to preserve: `CO-322`, Codex CLI `0.123.0`, `rust-v0.123.0`, `@openai/codex@0.123.0`, `0.122.0`, latest stable Codex CLI candidate, `node scripts/runtime-mode-canary.mjs`, `CODEX_CLOUD_ENV_ID=<valid> CODEX_CLOUD_CANARY_REQUIRED=1 npm run ci:cloud-canary`, `CLOUD_CANARY_EXPECT_FALLBACK=1`, `docs/guides/codex-version-policy.md`.
- Protected terms / exact artifact and surface names: `codex exec`, `codex review --help`, `codex login --device-auth`, `codex plugin marketplace`, `codex marketplace add`, `.github/workflows/cloud-canary.yml`, release-facing downstream smoke, current `0.122.0` plugin-marketplace smoke baseline, active target `0.118.0`.
- Nearby wrong interpretations to reject: blind latest-version bump, treating runtime canary success as sufficient without cloud canaries, treating absent top-level marketplace help as a current smoke regression after main rebaselined to `codex plugin marketplace add`, using CO-314/CO-315/CO-316 to avoid a CO-322 decision, or repairing unrelated docs-check baseline debt inside this audit.

## Parity / Alignment Matrix

| Surface | Current truth | Reference truth | Target truth / intended delta |
| --- | --- | --- | --- |
| Active CO target | `0.118.0` remains the active compatibility/adoption target. | Promotion requires runtime-mode, required cloud, and fallback cloud evidence. | Stay at `0.118.0` unless all gates pass. |
| Release-planning candidate | `0.122.0` is the held candidate from CO-269. | Upstream stable and npm latest are now `0.123.0`. | Promote only if 0.123.0 gates pass; otherwise keep `0.122.0` with the exact blocker. |
| Marketplace smoke | Release-facing smoke now uses the `0.122.0` `codex plugin marketplace add` contract from current main. | `0.123.0` still lacks top-level `codex marketplace add`, but exposes `codex plugin marketplace add/remove`. | No marketplace regression versus the current 0.122 plugin-marketplace baseline; do not move pins to 0.123.0 because cloud gates failed. |
| Cloud canary | `.github/workflows/cloud-canary.yml` pins `@openai/codex@0.122.0`. | Candidate canary pins must be evidence-backed and reproducible. | Do not move to `0.123.0` if required/fallback contracts fail. |

- Explicitly out-of-scope differences: release-notes parity, release-skill/docs-check parity, actual release-prep/ship actions, broad docs baseline repair, and marketplace contract redesign.

## Not Done If
- The next release claims or implies latest-stable Codex support without a fresh `0.123.0` evidence decision.
- CO mixes `0.122.0` and `0.123.0` release posture without an explicit adoption/hold decision.
- Public posture or release-facing pins move to `0.123.0` without runtime/cloud evidence gates.

## Goals
- Capture official upstream and npm `0.123.0` evidence with timestamps.
- Classify `0.123.0` help-surface drift against `0.122.0` assumptions.
- Capture runtime/cloud canary results or exact blockers.
- Update policy and release blocker story with a single explicit decision.

## Non-Goals
- No CO release publication, release notes parity, marketplace redesign, provider runtime migration, or unrelated docs-check baseline repair.

## Stakeholders
- Product: CO operators planning the next release.
- Engineering: CO release, canary, workflow, and marketplace smoke maintainers.
- Design: Not applicable.

## Metrics & Guardrails
- Primary Success Metrics: evidence artifacts exist under `out/linear-ed46eae2-f0f5-402f-9dc7-dd8dbc36e61f/manual/`; version policy and docs/TASKS state the same promote/hold decision.
- Guardrails / Error Budgets: no release-facing pin movement without clean gates; no false promotion from npm latest alone.

## User Experience
- Personas: CO maintainer deciding what candidate the next release may truthfully target; reviewer verifying release readiness claims.
- User Journeys: maintainer reads the policy and sees whether `0.123.0` is promoted or blocked, plus the exact evidence paths and next blocker.

## Technical Considerations
- Architectural Notes: candidate audit uses official GitHub release data, npm registry timestamps, temporary `@openai/codex@0.123.0` execution, runtime-mode canary, and cloud-canary wrapper manifests.
- Dependencies / Integrations: GitHub release API, npm registry, Codex CLI, `scripts/runtime-mode-canary.mjs`, `scripts/cloud-canary-ci.mjs`, Linear workpad, and CO docs hygiene.

## Open Questions
- None for this lane after current evidence: `0.123.0` is not promoted because the required cloud canary still cannot submit to environment `6999395fcc448191b865917084f21c6f`; the fallback contract passed only the expected local MCP fallback path.

## Approvals
- Product: issue acceptance criteria in CO-322.
- Engineering: parent provider worker issue-quality review on 2026-04-23.
- Design: Not applicable.
