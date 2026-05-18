# PRD - CO: Align docs/skills-release with post-0.121 marketplace command truth

## Summary
- Problem Statement: `docs/skills-release.md` no longer reflects the full post-CO-337 marketplace command-surface truth. Current `main` already uses `codex plugin marketplace add` and `@openai/codex@0.123.0` workflow pins, but the release guide still does not explicitly state that Codex CLI `0.121.0` accepts both marketplace add paths while Codex CLI `0.122.0` and newer require `codex plugin marketplace add`.
- Desired Outcome: refresh `docs/skills-release.md` so release operators see the exact command transition, current release-facing workflow pin rationale, and a distinct `cloud-canary` policy note without reopening CO-337 or changing workflows.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): complete the narrow CO-339 follow-up by making the stale release skill guide match the command-surface and workflow-pin truth established by CO-337.
- Success criteria / acceptance:
  - `docs/skills-release.md` says Codex CLI `0.121.0` accepts both `codex marketplace add` and `codex plugin marketplace add`
  - `docs/skills-release.md` says Codex CLI `0.122.0+` requires `codex plugin marketplace add`
  - release-facing workflow wording matches current `core-lane`, `release`, and `pack-smoke-backstop` pins at `@openai/codex@0.123.0`
  - `cloud-canary` wording remains distinct from release-facing `pack:smoke`
- Constraints / non-goals: no workflow-pin changes by default, no active CO target promotion, no cloud-canary policy change, and no broader marketplace/plugin UX redesign.

## Intent Checksum
- Exact user wording / phrases to preserve:
  - `CO-339`
  - `CO-337`
  - Codex CLI `0.121.0`
  - Codex CLI `0.122.0`
  - Codex CLI `0.123.0`
  - `codex marketplace add`
  - `codex plugin marketplace add`
  - `pack:smoke`
- Protected terms / exact artifact and surface names:
  - `docs/skills-release.md`
  - `.github/workflows/core-lane.yml`
  - `.github/workflows/release.yml`
  - `.github/workflows/pack-smoke-backstop.yml`
  - `.github/workflows/cloud-canary.yml`
  - `@openai/codex@0.123.0`
  - `docs/guides/codex-version-policy.md`
- Nearby wrong interpretations to reject:
  - reopening the broader CO-337 command-surface audit
  - claiming `0.122.0+` lacks a marketplace-compatible surface
  - instructing current Codex CLI users to run `codex marketplace add` unconditionally
  - changing workflow pins or cloud-canary behavior without fresh evidence
  - changing the active CO target as part of this docs-only lane

## Parity / Alignment Matrix
| Surface | Current truth | Reference truth | Target truth |
| --- | --- | --- | --- |
| `docs/skills-release.md` marketplace command wording | Names `codex plugin marketplace add`, but does not explicitly state the `0.121.0` both-path and `0.122.0+` plugin-path transition. | CO-337 recorded that `0.121.0` accepts both `codex marketplace add` and `codex plugin marketplace add`, while `0.122.0` and `0.123.0` require `codex plugin marketplace add`. | Release guide states the transition directly and avoids unconditional `codex marketplace add` guidance for current releases. |
| Release-facing workflow pins | Current `core-lane`, `release`, and `pack-smoke-backstop` install `@openai/codex@0.123.0` before `pack:smoke`. | CO-337 and current version policy keep release-facing smoke on the current plugin-marketplace path. | Release guide says these three release-facing workflows install `@openai/codex@0.123.0` for marketplace smoke. |
| `cloud-canary` policy | Current `cloud-canary` also installs `@openai/codex@0.123.0`, but for cloud evidence rather than downstream smoke. | The issue requires cloud-canary wording to stay distinct from release-facing workflow pins. | Release guide separates `cloud-canary` as the cloud-evidence lane and does not fold it into the `pack:smoke` workflow list. |

Explicitly out-of-scope differences: workflow edits, `pack:smoke` implementation changes, cloud-canary contract changes, active target promotion, and broader marketplace UX redesign.

## Not Done If
- `docs/skills-release.md` still implies `0.122.0+` lacks a marketplace-compatible surface.
- `docs/skills-release.md` still instructs `codex marketplace add` unconditionally for current Codex CLI releases.
- The doc still claims release-facing lanes stay pinned to `@openai/codex@0.121.0`.
- `cloud-canary` wording is collapsed into release-facing downstream smoke rather than described as its own evidence lane.

## Goals
- Make `docs/skills-release.md` truthful for Codex CLI `0.121.0`, `0.122.0`, and `0.123.0` marketplace add paths.
- Align the release-facing workflow-pin rationale to current `main`.
- Keep cloud-canary policy distinct and unchanged.

## Non-Goals
- No workflow-pin changes.
- No `pack:smoke` command implementation changes.
- No cloud-canary policy change.
- No active target change.
- No general plugin marketplace UX redesign.

## Stakeholders
- Product: CO maintainers and release operators.
- Engineering: release workflow, pack-smoke, and docs maintainers.
- Design: Not applicable.

## Metrics & Guardrails
- Primary Success Metrics: targeted doc text matches current workflow files and version-policy truth; grep confirms the stale `0.121.0` release-pin claim is absent from `docs/skills-release.md`.
- Guardrails / Error Budgets: zero workflow behavior changes, zero cloud-canary weakening, zero broad command-surface re-audit.

## User Experience
- Personas:
  - Release operator checking which Codex CLI marketplace command the smoke path expects.
  - Reviewer confirming release-facing workflow pin rationale.
- User Journeys:
  - Operator reads the release guide and sees which command applies to `0.121.0` versus `0.122.0+`.
  - Reviewer checks the workflow list and sees `cloud-canary` treated separately from release-facing `pack:smoke`.

## Technical Considerations
- Architectural Notes: this is a docs-only alignment lane. The parent lane should create the task packet, run docs-review, edit `docs/skills-release.md`, and validate with targeted grep plus repo docs/review gates.
- Dependencies / Integrations: CO-337 packet and current-main `docs/guides/codex-version-policy.md`, `.github/workflows/core-lane.yml`, `.github/workflows/release.yml`, `.github/workflows/pack-smoke-backstop.yml`, and `.github/workflows/cloud-canary.yml`.

## Open Questions
- None blocking. Current `origin/main` already contains `@openai/codex@0.123.0` workflow pins, so this lane only needs to fix the residual release guide wording.

## Approvals
- Product: issue accepted via CO-339.
- Engineering: docs-review, implementation validation, standalone review, and elegance review complete; PR handoff pending.
- Design: Not applicable.
