---
id: 20260424-linear-co-341-codex-0124-gpt55-posture
title: CO: Re-audit Codex CLI 0.124.0 posture and GPT-5.5 hook/config alignment
status: in_progress
owner: Codex
created: 2026-04-24
last_review: 2026-04-24
review_cadence_days: 30
risk_level: high
related_prd: docs/PRD-linear-co-341-codex-0124-gpt55-posture.md
related_action_plan: docs/ACTION_PLAN-linear-co-341-codex-0124-gpt55-posture.md
related_tasks:
  - tasks/tasks-linear-co-341-codex-0124-gpt55-posture.md
---

# Task Spec - CO: Re-audit Codex CLI 0.124.0 posture and GPT-5.5 hook/config alignment

- Linear Issue: `CO-341`
- MCP Task ID: `linear-co-341-codex-0124-gpt55-posture`
- Primary PRD: `docs/PRD-linear-co-341-codex-0124-gpt55-posture.md`
- TECH_SPEC: `docs/TECH_SPEC-linear-co-341-codex-0124-gpt55-posture.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-co-341-codex-0124-gpt55-posture.md`
- Risk: high

## Scope
- Validate Codex CLI `0.124.0` and `gpt-5.5` `xhigh` posture against CO command, runtime, delegation, review, provider, cloud, and downstream-smoke surfaces.
- Fix or document local hook/config drift found by `0.124.0`.
- Update CO posture docs/defaults/workflow pins/tests only after evidence supports the change.
- Monitor related Linear issues without exceeding the configured In Progress cap.

## Acceptance Criteria
- `0.124.0` identity and release/package evidence are captured.
- `gpt-5.5` `xhigh` smoke succeeds on intended local/delegated surfaces.
- Review/provider and cloud surfaces have pass evidence or explicit blockers.
- Hook/config smoke no longer emits the targeted stale feature or stale notify warnings.
- Repo posture changes have focused tests and full validation floor evidence.
- Linear state for CO-337, CO-338, CO-340, and CO-341 is truthful.

## Evidence Targets
- `out/linear-co-341-codex-0124-gpt55-posture/manual/`
- `.runs/linear-co-341-codex-0124-gpt55-posture*/`
- Linear comments on CO-341 and related issues.

## Non-Goals
- Release publish recovery in CO-338.
- Broad plugin cleanup outside CO-owned assets.
- Delegation/review guard weakening.
