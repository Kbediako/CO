# Task Checklist - linear-b8a32c11-cfc6-4556-b783-f59b290fe67d
## Docs-first
- [x] PRD, TECH_SPEC, ACTION_PLAN, `tasks/index.json`, and `docs/TASKS.md` updated for `CO-22`.
- [x] Checklist mirrored and docs-review evidence recorded. Evidence: `.runs/linear-b8a32c11-cfc6-4556-b783-f59b290fe67d-docs-review/cli/2026-03-27T14-15-07-635Z-fe73e2e2/manifest.json`
- [x] Standalone pre-implementation review captured in the spec/task packet notes.
## Implementation
- [x] Re-audited the live upstream `0.117.0` plus upstream-main baseline against current CO runtime/docs surfaces. Evidence: `out/linear-b8a32c11-cfc6-4556-b783-f59b290fe67d/manual/adoption-decision-closeout.md`
- [x] Corrected active stale `max_spawn_depth` / version-policy assumptions or recorded explicit defers with reasons. Evidence: `AGENTS.md`, `docs/AGENTS.md`, `docs/guides/codex-version-policy.md`, `docs/guides/rlm-recursion-v2.md`, `README.md`, `templates/codex/AGENTS.md`, `skills/delegation-usage/SKILL.md`, `skills/delegation-usage/DELEGATION_GUIDE.md`
- [x] Captured bounded multi-agent-v2 and app-server canary evidence under CO-owned artifacts. Evidence: `out/linear-b8a32c11-cfc6-4556-b783-f59b290fe67d/manual/live-multi-agent-canary.jsonl`, `out/linear-b8a32c11-cfc6-4556-b783-f59b290fe67d/manual/app-server-help.txt`, `out/linear-b8a32c11-cfc6-4556-b783-f59b290fe67d/manual/runtime-mode-canary/runtime-canary-summary.json`
- [x] Recorded the provider-worker supervision recommendation and explicit `CO-13` / `CO-14` sequencing impact. Evidence: `docs/TECH_SPEC-linear-b8a32c11-cfc6-4556-b783-f59b290fe67d.md`, `out/linear-b8a32c11-cfc6-4556-b783-f59b290fe67d/manual/adoption-decision-closeout.md`
## Validation
- [x] `delegation-guard`, `spec-guard --dry-run`, `build`, `lint`, `test`, `docs:check`, `docs:freshness`, `diff-budget`, and `review`. Evidence: `out/linear-b8a32c11-cfc6-4556-b783-f59b290fe67d/manual/adoption-decision-closeout.md`
- [x] `pack:smoke` if downstream-facing CLI/package surfaces changed. Evidence: `out/linear-b8a32c11-cfc6-4556-b783-f59b290fe67d/manual/adoption-decision-closeout.md`
- [ ] PR checks / ready-review quiet window green.
