---
id: 20260421-linear-904f74a5-e1b6-4740-a0df-8c92ec73314b
title: "CO-268 marketplace docs and smoke coverage rebaseline to Codex 0.122 plugin marketplace commands"
relates_to: docs/PRD-linear-904f74a5-e1b6-4740-a0df-8c92ec73314b.md
risk: medium
owners:
  - Codex
last_review: 2026-04-21
---

# TECH_SPEC: CO-268 marketplace docs and smoke coverage rebaseline to Codex 0.122 plugin marketplace commands

## Scope

This spec defines the narrow rebaseline contract for `CO-268`.

- Parent-owned implementation surfaces:
  - `scripts/pack-smoke.mjs`
  - `tests/pack-smoke.spec.ts`
  - `plugins/codex-orchestrator/launcher.mjs`
  - `.github/workflows/core-lane.yml`
  - `.github/workflows/pack-smoke-backstop.yml`
  - `.github/workflows/release.yml`
  - docs packet and registry mirrors for this issue
- Child-lane-owned surface:
  - `README.md`
  - `docs/public/downstream-setup.md`

The target outcome is a truthful `0.122.0` command-surface rebaseline. Packaging, npm support, provider-worker authority, app-server routing, and plugin architecture remain unchanged.

## Source And Evidence

- Linear issue: `CO-268`
- Issue id: `904f74a5-e1b6-4740-a0df-8c92ec73314b`
- Source anchor: `ctx:sha256:ec9b1d2d54349512a2691004f2a7801fa37b85ef8f086240d3f4199d1fc8bbee#chunk:c000001`
- Declared source payload: `.runs/linear-904f74a5-e1b6-4740-a0df-8c92ec73314b/cli/2026-04-21T01-43-26-870Z-6fb785d8/memory/source-0/source.txt`
- Declared manifest: `.runs/linear-904f74a5-e1b6-4740-a0df-8c92ec73314b/cli/2026-04-21T01-43-26-870Z-6fb785d8/manifest.json`
- Canonical owner key: `codex-0122-plugin-marketplace-command-rebaseline`
- Source evidence gathered on 2026-04-21:
  - official GitHub release `rust-v0.122.0` is `Latest` and published `2026-04-20`
  - `codex --version` -> `codex-cli 0.122.0`
  - `codex marketplace add --help` fails with `unrecognized subcommand 'add'`
  - `codex plugin marketplace add --help` succeeds
  - `codex plugin marketplace remove --help` succeeds

## Protected Contract

The protected issue terms are:

- `Codex CLI 0.122.0`
- `codex plugin marketplace add`
- `codex plugin marketplace remove`
- `codex marketplace add`
- `README.md`
- `docs/public/downstream-setup.md`
- `scripts/pack-smoke.mjs`
- `tests/pack-smoke.spec.ts`
- `plugins/codex-orchestrator/launcher.mjs`
- `CO-196`

## Current / Reference / Target Matrix

| Surface | Current | Reference | Target |
| --- | --- | --- | --- |
| Public docs | README/downstream setup still use `codex marketplace add`. | Local `0.122.0` exposes `codex plugin marketplace add/remove`. | Public docs use the plugin marketplace namespace. |
| Launcher guidance | Recovery messages tell users to re-run `codex marketplace add`. | Users need recovery text that matches the live CLI. | Launcher errors tell users to re-run `codex plugin marketplace add`. |
| Pack-smoke prerequisite + invocation | Support detection checks `codex marketplace add --help`; smoke invokes `codex marketplace add ...`. | Stable `0.122.0` moved marketplace add/remove under `codex plugin marketplace`. | Detection and invocation use the plugin marketplace path. |
| Related tests/workflows | Tests assert `marketplace add` wording and workflow pins install `@openai/codex@0.121.0`. | Stable smoke coverage should validate the same `0.122.0` surface users see. | Tests assert the new wording and workflows install `@openai/codex@0.122.0`. |
| Packaging boundary | CO-196 shipped the packaged marketplace path on the old CLI surface. | The underlying packaging files remain valid. | Keep packaging unchanged; update only the command-surface contract. |

## Readiness Gate

- Not done if:
  - public/downstream docs still instruct `codex marketplace add` for `0.122.0`
  - launcher recovery strings still tell users to run the old command
  - pack-smoke still checks only the old command path or still invokes the old command path
  - tests or workflow pins still enforce `0.121.0` marketplace-command expectations
  - npm baseline support or marketplace packaging structure changes
- Pre-implementation issue-quality review evidence:
  - 2026-04-21: parent review confirms this is a narrow rebaseline lane. The issue is not a packaging redesign, not a general posture promotion, and not an authority-boundary change. The workflow pin updates are in scope because the related pack-smoke contract test enforces the smoke environment version and would otherwise preserve `0.121.0` truth.
- Safeguard ownership split:
  - child lane owns only `README.md` and `docs/public/downstream-setup.md`
  - parent avoids those files until the child lane is accepted or manually applied

## Technical Requirements

1. Public install guidance must use `codex plugin marketplace add <source>` instead of `codex marketplace add <source>`.
2. Public removal guidance must include `codex plugin marketplace remove codex-orchestrator`.
3. Launcher recovery strings in `plugins/codex-orchestrator/launcher.mjs` must tell users to re-run `codex plugin marketplace add`.
4. `scripts/pack-smoke.mjs` must detect plugin marketplace support using the live `0.122.0` command path.
5. `scripts/pack-smoke.mjs` must invoke `codex plugin marketplace add ...` for smoke registration.
6. Pack-smoke prerequisite fail/skip messages must truthfully mention the live plugin marketplace command surface.
7. `tests/pack-smoke.spec.ts` must assert the updated prerequisite messages and install pin.
8. Smoke-enforcement workflows must install `@openai/codex@0.122.0` before `npm run pack:smoke`.
9. npm install guidance, marketplace packaging layout, and `CO-196` lineage must remain intact.

## Architecture & Data

- Architecture / design adjustments:
  - keep the runtime/data model unchanged
  - rebaseline a small helper in `scripts/pack-smoke.mjs` so detection and invocation use a single command-surface truth
  - keep workflow pins explicit so smoke coverage runs against the same stable CLI the docs describe
- Data model changes / migrations:
  - none
- External dependencies / integrations:
  - local Codex CLI
  - GitHub release evidence for `rust-v0.122.0`
  - GitHub Actions workflows that provide smoke coverage

## Validation Plan

- Evidence checks:
  - `codex --version`
  - `codex marketplace add --help`
  - `codex plugin marketplace add --help`
  - `codex plugin marketplace remove --help`
- Focused checks:
  - `npm run test:orchestrator -- tests/pack-smoke.spec.ts`
  - any additional focused assertion on `scripts/pack-smoke.mjs` if needed
- Required gates:
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `npm run repo:stewardship`
  - `node scripts/diff-budget.mjs`
  - `npm run pack:smoke`
- Review gates:
  - child `docs-review` stream before implementation handoff closes
  - standalone review
  - elegance review

## Wrong Interpretations To Reject

- Do not add a new packaging architecture.
- Do not de-support npm.
- Do not convert this into a broad `0.122.0` adoption lane.
- Do not rewrite unrelated historical/internal docs just because they mention the older command.
- Do not leave workflows on `0.121.0` while claiming smoke coverage matches `0.122.0`.

## Non-Goals

- No plugin packaging redesign.
- No removal of the current marketplace files or launcher contract.
- No general posture-audit updates outside the explicit linkage/reference needed here.
- No provider-worker, app-server, or review-wrapper changes.

## Open Questions

- If any internal non-public docs still mention the old surface after this narrow lane, should that be a follow-up with the same canonical owner key?

## Approvals

- Reviewer: Codex provider worker.
- Date: 2026-04-21.
