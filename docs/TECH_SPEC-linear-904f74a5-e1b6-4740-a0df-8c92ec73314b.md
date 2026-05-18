---
id: 20260421-linear-904f74a5-e1b6-4740-a0df-8c92ec73314b
title: CO-268 marketplace docs and smoke coverage rebaseline to Codex 0.122 plugin marketplace commands
relates_to: docs/PRD-linear-904f74a5-e1b6-4740-a0df-8c92ec73314b.md
risk: medium
owners:
  - Codex
last_review: 2026-04-21
---

# TECH_SPEC: CO-268 Marketplace Docs And Smoke Coverage Rebaseline To Codex 0.122 Plugin Marketplace Commands

## Summary
- Objective: Align CO docs, launcher guidance, pack-smoke logic, tests, and marketplace smoke workflow pins with the Codex CLI `0.122.0` plugin marketplace command surface.
- Scope: `scripts/pack-smoke.mjs`, `tests/pack-smoke.spec.ts`, `plugins/codex-orchestrator/launcher.mjs`, `.github/workflows/core-lane.yml`, `.github/workflows/pack-smoke-backstop.yml`, `.github/workflows/release.yml`, `docs/guides/codex-version-policy.md`, issue docs/checklists/registries, plus child-owned public docs (`README.md`, `docs/public/downstream-setup.md`, `docs/skills-release.md`).
- Constraints: Keep npm baseline guidance and the existing `CO-196` packaged marketplace architecture unchanged.

## Issue-Shaping Contract
- User-request translation carried forward: Rebaseline the command surface from `codex marketplace add` to `codex plugin marketplace add/remove` for Codex CLI `0.122.0` without broadening into posture promotion or packaging redesign.
- Protected terms / exact artifact and surface names: `Codex CLI 0.122.0`, `rust-v0.122.0`, `codex plugin marketplace add`, `codex plugin marketplace remove`, `codex marketplace add`, `README.md`, `docs/public/downstream-setup.md`, `scripts/pack-smoke.mjs`, `tests/pack-smoke.spec.ts`, `plugins/codex-orchestrator/launcher.mjs`, `CO-196`.
- Nearby wrong interpretations to reject: new marketplace packaging feature lane, npm path removal, general `0.122.0` posture promotion, provider-worker authority change, app-server routing change, plugin architecture redesign.
- Explicit non-goals carried forward: no packaging architecture change, no active Codex target promotion, no provider-worker/app-server/authority changes, no npm de-support.

## Source And Evidence
- Linear issue: `CO-268` / `904f74a5-e1b6-4740-a0df-8c92ec73314b`.
- Source anchor: `ctx:sha256:a55875599fbe621fd6a8da356298043a82116c53aa99ee0551cd826ab74cdd2e#chunk:c000001`.
- Source payload: `.runs/linear-904f74a5-e1b6-4740-a0df-8c92ec73314b/cli/2026-04-21T11-01-31-512Z-dfe5908b/memory/source-0/source.txt`.
- Source manifest: `.runs/linear-904f74a5-e1b6-4740-a0df-8c92ec73314b/cli/2026-04-21T11-01-31-512Z-dfe5908b/manifest.json`.
- Official release evidence captured 2026-04-21: `gh release view rust-v0.122.0 --repo openai/codex --json tagName,name,publishedAt,url,isDraft,isPrerelease` returned tag `rust-v0.122.0`, name `0.122.0`, published `2026-04-20T18:38:40Z`, URL `https://github.com/openai/codex/releases/tag/rust-v0.122.0`, `isDraft=false`, `isPrerelease=false`.
- Local command evidence captured 2026-04-21:
  - `codex --version` -> `codex-cli 0.122.0`
  - `codex marketplace add --help` exits `2` with `unrecognized subcommand 'add'`
  - `codex plugin marketplace add --help` exits `0`
  - `codex plugin marketplace remove --help` exits `0`

## Parity / Alignment Matrix
| Surface | Current truth | Reference truth | Target truth |
| --- | --- | --- | --- |
| npm baseline | npm install remains the primary stable downstream path. | Issue explicitly rejects npm path removal or de-prioritization. | Keep npm guidance and package architecture unchanged. |
| Marketplace registration command | Current docs/smoke still reference `codex marketplace add`. | Codex CLI `0.122.0` exposes `codex plugin marketplace add`. | Public docs, pack-smoke detection, pack-smoke invocation, and launcher recovery use `codex plugin marketplace add`. |
| Public removal command | Rollback/removal guidance lacks the current plugin marketplace removal command. | Codex CLI `0.122.0` exposes `codex plugin marketplace remove <MARKETPLACE_NAME>`. | Public docs include `codex plugin marketplace remove codex-orchestrator`. |
| Launcher recovery command surface | `plugins/codex-orchestrator/launcher.mjs` says to re-run `codex marketplace add`. | Live recovery command is `codex plugin marketplace add`. | Launcher error messages say to re-run `codex plugin marketplace add` for Codex Orchestrator. |
| Pack-smoke detection/invoke path | `scripts/pack-smoke.mjs` probes `codex marketplace add --help` and invokes `codex marketplace add ...`. | `codex marketplace add --help` fails on local `0.122.0`; `codex plugin marketplace add --help` succeeds. | Detection probes and smoke registration invoke `codex plugin marketplace add`. |
| Related tests and pins | `tests/pack-smoke.spec.ts` asserts `@openai/codex@0.121.0` marketplace smoke setup and old command messages. | The issue targets `@openai/codex@0.122.0` for marketplace smoke command-surface truth. | Tests assert `@openai/codex@0.122.0`, plugin marketplace messages, and workflow coverage. |
| Version-policy lineage | `docs/guides/codex-version-policy.md` still records the CO-269 release-facing smoke hold on `0.121.0` because `pack:smoke` used `codex marketplace add`. | CO-268 intentionally revises that marketplace smoke contract to `codex plugin marketplace add` with local `0.122.0` evidence. | Version policy records the CO-268 supersession without promoting the active CO compatibility target from `0.118.0`. |
| Packaged marketplace/plugin architecture from CO-196 | CO-196 shipped the packaging path. | The shipped packaging path remains valid. | No plugin descriptor, marketplace layout, launcher architecture, or package topology redesign. |

## Readiness Gate
- Not done if:
  - public/downstream docs still instruct `codex marketplace add` for `0.122.0`
  - launcher recovery strings still tell users to run the old command
  - pack-smoke still checks or invokes only the old command path
  - tests/workflows still enforce `0.121.0` marketplace-command expectations for this lane
  - npm baseline support or marketplace packaging structure changes
- Pre-implementation issue-quality review evidence:
  - 2026-04-21 parent review confirms `CO-268` is a narrow command-surface rebaseline. The workflow pin updates are in scope because the smoke command surface must run against the stable CLI it documents. The lane is not a general posture promotion because it leaves CO active-target policy untouched.
- Safeguard ownership split:
  - child lane owns `README.md`, `docs/public/downstream-setup.md`, and `docs/skills-release.md`
  - parent owns docs packet, registry mirrors, code/test/workflow surfaces, validation, review, PR, and Linear handoff

## Technical Requirements
- Functional requirements:
  - Update launcher recovery text to `codex plugin marketplace add`.
  - Update `scripts/pack-smoke.mjs` support detection to `codex plugin marketplace add --help`.
  - Update `scripts/pack-smoke.mjs` smoke registration to `codex plugin marketplace add <source>`.
  - Update pack-smoke fail/skip messages to mention the plugin marketplace command surface.
  - Update focused tests and workflow assertions for `@openai/codex@0.122.0`.
  - Update smoke workflows that run `npm run pack:smoke` to install `@openai/codex@0.122.0`.
- Non-functional requirements (performance, reliability, security):
  - Fail closed unless marketplace smoke is genuinely available or explicitly reason-skipped for local development.
  - Preserve existing non-interactive behavior and review/CI determinism.
  - Do not weaken guardrails or authority boundaries.
- Interfaces / contracts:
  - CLI command surface: `codex plugin marketplace add`, `codex plugin marketplace remove`.
  - Pack-smoke exported prerequisite resolver remains importable for tests.

## Architecture & Data
- Architecture / design adjustments:
  - No architecture change. This is a command-surface string and invocation update.
  - Keep existing `MARKETPLACE_NAME` and `PLUGIN_NAME` constants.
- Data model changes / migrations:
  - None.
- External dependencies / integrations:
  - `openai/codex` `rust-v0.122.0` release, local Codex CLI `0.122.0`, GitHub Actions workflows.

## Validation Plan
- Tests / checks:
  - `codex --version`
  - `codex marketplace add --help`
  - `codex plugin marketplace add --help`
  - `codex plugin marketplace remove --help`
  - `npm run test:orchestrator -- tests/pack-smoke.spec.ts`
  - required repo validation gates from `AGENTS.md`
- Rollout verification:
  - `npm run pack:smoke` should exercise marketplace add through the plugin command path when local Codex is available.
  - PR `ready-review` drain must exit clean before review handoff.
- Monitoring / alerts:
  - Not applicable beyond CI/review checks.

## Open Questions
- None for the command-surface rebaseline.

## Approvals
- Reviewer: parent provider worker
- Date: 2026-04-21
