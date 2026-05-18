---
id: 20260424-linear-09b7afc2-529a-40cc-975c-57c33f2bb596
title: CO docs/skills-release post-0.121 marketplace command alignment
relates_to: docs/PRD-linear-09b7afc2-529a-40cc-975c-57c33f2bb596.md
risk: medium
owners:
  - Codex
last_review: 2026-04-24
---

## Summary
- Objective: register CO-339 as the bounded release-guide alignment lane for the post-CO-337 marketplace command transition.
- Scope: `docs/skills-release.md`, task packet files, registry mirrors, and validation evidence.
- Constraints: no workflow edits, no `pack:smoke` implementation edits, no cloud-canary policy edits, and no active-target promotion.

## Issue-Shaping Contract
- User-request translation carried forward: CO-339 is a narrow stale-doc fix. Parent must preserve the exact marketplace command transition and current release-facing workflow pin truth without reopening CO-337.
- Protected terms / exact artifact and surface names: `docs/skills-release.md`, Codex CLI `0.121.0`, Codex CLI `0.122.0`, Codex CLI `0.123.0`, `codex marketplace add`, `codex plugin marketplace add`, `pack:smoke`, `.github/workflows/core-lane.yml`, `.github/workflows/release.yml`, `.github/workflows/pack-smoke-backstop.yml`, `.github/workflows/cloud-canary.yml`, `@openai/codex@0.123.0`.
- Nearby wrong interpretations to reject: broad command-surface re-audit, `0.122.0+` marketplace removal framing, unconditional top-level `codex marketplace add` guidance, workflow-pin churn, cloud-canary weakening, or active target promotion.
- Explicit non-goals carried forward: no workflow pin changes by default, no cloud-canary changes, no broader marketplace/plugin UX redesign, and no active target change.

## Parity / Alignment Matrix
- Current truth:
  - `docs/skills-release.md` names `codex plugin marketplace add` and `@openai/codex@0.123.0` release-facing pins, but omits the explicit `0.121.0` both-path versus `0.122.0+` plugin-path command transition.
  - current workflow files install `@openai/codex@0.123.0` in `core-lane`, `release`, `pack-smoke-backstop`, and `cloud-canary`.
- Reference truth:
  - CO-337 recorded `0.121.0` accepting both `codex marketplace add` and `codex plugin marketplace add`.
  - CO-337 recorded `0.122.0` and `0.123.0` requiring `codex plugin marketplace add`.
  - `cloud-canary` is a cloud evidence lane, not part of the release-facing `pack:smoke` workflow list.
- Target truth:
  - `docs/skills-release.md` states the command transition directly.
  - release-facing workflow wording lists `core-lane`, `release`, and `pack-smoke-backstop` as `@openai/codex@0.123.0` smoke lanes.
  - `cloud-canary` remains separately described as the explicit `@openai/codex@0.123.0` cloud-evidence lane.
- Explicitly out-of-scope differences:
  - workflow behavior and pins
  - pack-smoke implementation
  - active target and cloud gate policy

## Readiness Gate
- Not done if: the release guide lacks the command transition, tells current users to run top-level `codex marketplace add` unconditionally, claims release-facing workflows are pinned to `0.121.0`, or blurs `cloud-canary` into downstream smoke.
- Pre-implementation issue-quality review evidence: parent review approves this as a parity/alignment lane, not a micro-task, because correctness depends on exact command names, version boundaries, and workflow-surface wording.
- Safeguard ownership split: parent owns all docs packet, registry, target doc, Linear workpad, validation, and review handoff for this single bounded diff.

## Technical Requirements
- Functional requirements:
  1. Create the CO-339 PRD, TECH_SPEC, ACTION_PLAN, task checklist, and `.agent` mirror.
  2. Register the task in `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
  3. Run docs-review before editing `docs/skills-release.md`, or record a truthful fallback if tooling is unavailable.
  4. Update `docs/skills-release.md` to state:
     - Codex CLI `0.121.0` accepts both `codex marketplace add` and `codex plugin marketplace add`
     - Codex CLI `0.122.0+` requires `codex plugin marketplace add`
     - release-facing workflows install `@openai/codex@0.123.0` before `pack:smoke`
     - `cloud-canary` pins `@openai/codex@0.123.0` separately for cloud evidence
- Non-functional requirements (performance, reliability, security):
  - keep docs concise and release-operator oriented
  - avoid weakening fail-closed smoke language
  - avoid implying marketplace smoke proves cloud canary readiness
- Interfaces / contracts:
  - `docs/skills-release.md` release operator guidance
  - workflow install steps in the four named workflow files
  - `docs/guides/codex-version-policy.md` command-surface lineage

## Architecture & Data
- Architecture / design adjustments: none beyond docs wording.
- Data model changes / migrations: none.
- External dependencies / integrations: local repo evidence from current `origin/main`; no external API dependency is required for this narrow follow-up.

## Validation Plan
- Tests / checks:
  - docs-review child stream before target-doc implementation
  - targeted `rg` checks against `docs/skills-release.md`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - required review/elegance gates before handoff, with bounded fallback if tooling stalls
- Rollout verification:
  - verify `docs/skills-release.md` names all protected commands, versions, and workflow surfaces accurately
  - verify no workflow files changed
- Monitoring / alerts: existing docs hygiene and review gates only.

## Open Questions
- None blocking.

## Approvals
- Reviewer: docs-review and standalone review completed; post-fix standalone review rerun had no actionable findings.
- Date: 2026-04-24
