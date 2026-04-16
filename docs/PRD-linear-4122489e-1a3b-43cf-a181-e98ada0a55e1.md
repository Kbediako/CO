# PRD - CO: Re-audit Codex CLI 0.121.0 Adoption Posture

## Summary
- Problem Statement: CO still documents Codex CLI `0.118.0` as its compatibility/adoption target even though this provider workspace now runs `codex-cli 0.121.0` and upstream has published official `rust-v0.121.0` release evidence. Prior `0.120.0` lanes proved local command-surface compatibility but held promotion because the required cloud canary contract lacked `CODEX_CLOUD_ENV_ID`.
- Desired Outcome: produce a dated, artifact-backed `0.121.0` posture decision that re-audits official release/npm facts, protected local command surfaces, runtime and cloud canary contracts, auth-profile rotation assumptions, and provider/review/delegation/appserver guardrails before deciding promote versus hold.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): treat CO-195 as the current stable Codex CLI adoption audit, not a string bump. The audit must prove whether CO can promote from `0.118.0` to `0.121.0`, with cloud canary evidence as a required gate and explicit attention to users rotating multiple GPT/Codex auth profiles.
- Success criteria / acceptance:
  - official GitHub/OpenAI changelog and npm latest facts captured with timestamps
  - local `codex` command surfaces audited under `0.121.0`
  - runtime-mode, cloud-required, and cloud-fallback canary evidence or blockers recorded
  - auth-profile rotation workflow assessed without exposing secrets
  - promote/hold decision reflected consistently across active docs and task mirrors
  - no P0/P1 provider, review, delegation, appserver, or exec-server regression
- Constraints / non-goals: do not adopt plugin marketplace packaging, MCP Apps metadata, provider-worker appserver supervision, `gpt-5.4-codex` under ChatGPT auth, or spark policy refactors.

## Intent Checksum
- Exact user wording / phrases to preserve:
  - "Re-audit CO against stable Codex CLI 0.121.0"
  - "required cloud canary"
  - "users rotating multiple GPT/Codex auth profiles"
  - "Decide promote or hold"
- Protected terms / exact artifact and surface names:
  - Codex CLI `0.121.0`
  - Codex CLI `0.118.0`
  - `rust-v0.121.0`
  - `@openai/codex`
  - `codex exec`
  - `codex exec resume`
  - `codex review --help`
  - `codex login --device-auth`
  - `codex marketplace add --help`
  - `codex app-server`
  - `codex mcp`
  - `scripts/runtime-mode-canary.mjs`
  - `CODEX_CLOUD_ENV_ID`
  - `CODEX_CLOUD_CANARY_REQUIRED=1`
  - `CLOUD_CANARY_EXPECT_FALLBACK=1`
- Nearby wrong interpretations to reject:
  - promoting `0.121.0` from local `codex --version` alone
  - treating missing cloud evidence as a passed cloud canary
  - burying a reproduced reusable auth-profile/cloud credential bug inside posture docs instead of creating a linked Bug
  - switching provider workers to appserver or adopting marketplace packaging as part of this audit
  - using this lane to revisit CO-191 spark policy boundaries

## Parity / Alignment Matrix
- Current truth: active policy targets `0.118.0`; prior `0.120.0` audit found local command surfaces compatible but held promotion because required cloud canary could not execute without `CODEX_CLOUD_ENV_ID`.
- Reference truth: official `rust-v0.121.0` release and OpenAI changelog identify 0.121.0 as an April 2026 Codex CLI release; npm `@openai/codex` latest must be captured from the registry at audit time.
- Target truth / intended delta: either promote active docs to `0.121.0` only after all required gates pass, or keep `0.118.0` as the active target while naming `0.121.0` as the latest stable candidate with exact blockers and no local P0/P1 regressions.
- Explicitly out-of-scope differences: plugin marketplace packaging, MCP Apps metadata adoption, provider-worker appserver migration, `gpt-5.4-codex` validation, and spark policy refactors.

## Not Done If
- The result is only a version-string edit.
- Official release/npm facts are missing timestamps or source URLs.
- Cloud-required and cloud-fallback canary outcomes are absent or collapsed into a generic "cloud unavailable" statement.
- Missing `CODEX_CLOUD_ENV_ID`, auth/profile mismatch, quota exhaustion, cloud denial, and provider/runtime regression classes are not distinguished.
- Auth profile rotation is not validated at least to the command/config boundary.
- A reproduced reusable auth-profile/cloud credential bug is not filed as a linked Bug.
- The final decision disagrees across README, AGENTS docs, `docs/TASKS.md`, `tasks/index.json`, and checklist mirrors.

## Goals
- Preserve a complete task-scoped audit packet for `0.121.0`.
- Decide promote versus hold using the existing CO version-policy gates.
- Keep provider-worker `codex exec` / `codex exec resume` supervision unchanged unless evidence proves a regression.
- Keep appserver and exec-server guarded as control substrates, not provider-worker defaults.
- Keep the multiple-auth workflow safe by treating `CODEX_HOME` / profile rotation as an operator-owned credential boundary.

## Non-Goals
- Plugin marketplace packaging.
- MCP Apps metadata adoption.
- Switching provider workers to appserver.
- Validating `gpt-5.4-codex` under ChatGPT auth.
- Spark policy refactors; CO-191 remains the boundary.

## Stakeholders
- Product: CO operators and downstream users relying on documented Codex CLI posture.
- Engineering: CO runtime, provider-worker, review-wrapper, delegation, appserver, and cloud-canary maintainers.
- Design: Not applicable.

## Metrics & Guardrails
- Primary Success Metrics: audit artifacts exist; runtime canary passes; cloud canary passes or blocker is exact; docs/catalog checks agree with the final decision; no P0/P1 regression is found.
- Guardrails / Error Budgets: cloud promotion remains blocked without required cloud evidence or explicit waiver; auth secrets are not printed into docs or workpad; changes remain posture/evidence only unless canaries expose a concrete bug.

## User Experience
- Personas:
  - CO maintainer deciding whether to update the documented Codex CLI target.
  - Provider-worker operator rotating multiple ChatGPT/Codex auth homes.
  - Reviewer checking whether a newer CLI is safe for downstream users.
- User Journeys:
  - Maintainer reads `docs/guides/codex-version-policy.md` and sees the current target, latest candidate, evidence paths, and blockers.
  - Operator checks the task packet to confirm whether local `0.121.0` drift is acceptable or promotion-ready.
  - Reviewer verifies cloud-canary outcome and auth-profile boundary evidence before approving handoff.

## Technical Considerations
- Architectural Notes: this is a docs/evidence posture lane unless canary or auth-profile checks expose a concrete runtime bug.
- Dependencies / Integrations: official GitHub release page, OpenAI Codex changelog, npm registry, local Codex CLI, CO runtime-mode canary, CO cloud-canary wrapper, Linear workpad, GitHub PR lifecycle.

## Open Questions
- Answered 2026-04-16: this workspace does not have `CODEX_CLOUD_ENV_ID`, `CODEX_API_KEY`, or `OPENAI_API_KEY`, so promotion remains blocked by the required cloud canary configuration gate.
- Answered 2026-04-16: local `0.121.0` did not reproduce a reusable auth-profile/cloud credential bug at the safe `CODEX_HOME` / `--profile` command boundary; no linked Bug was filed.
- Answered 2026-04-16: marketplace support is compatible/no-op for CO packaging in this lane, and app-server/MCP surfaces need no immediate adoption beyond the existing guarded policy wording.

## Approvals
- Product: issue accepted via CO-195.
- Engineering: pre-implementation issue-quality review approved; docs-review succeeded at `.runs/linear-4122489e-1a3b-43cf-a181-e98ada0a55e1-co-195-docs-review-r3/cli/2026-04-15T23-10-57-461Z-e2b822df/manifest.json`; final posture is hold `0.118.0` with `0.121.0` as latest audited candidate.
- Design: Not applicable.
