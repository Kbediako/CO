# Agent Task - CO: Re-audit Codex CLI 0.124.0 posture and GPT-5.5 hook/config alignment

- Linear Issue: `CO-341`
- MCP Task ID: `linear-co-341-codex-0124-gpt55-posture`
- PRD: `docs/PRD-linear-co-341-codex-0124-gpt55-posture.md`
- TECH_SPEC: `docs/TECH_SPEC-linear-co-341-codex-0124-gpt55-posture.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-co-341-codex-0124-gpt55-posture.md`
- Checklist: `tasks/tasks-linear-co-341-codex-0124-gpt55-posture.md`

## Operator Brief
Continue the interrupted CO orchestration with subagent support. Validate Codex CLI `0.124.0` and `gpt-5.5` `xhigh` across CO runtime, review, delegation, provider, cloud, and downstream-smoke surfaces before promoting. Keep the Orchestrator continuation hook enabled and monitor CO-337, CO-338, CO-340, and CO-341 truthfully.

## Guardrails
- Use `/Users/kbediako/Code/CO-co341-codex-0124` for repo edits.
- Do not edit or revert unrelated dirty changes in `/Users/kbediako/Code/CO`.
- Do not exceed four CO issues In Progress.
- Do not promote `0.124.0` or `gpt-5.5` based only on local exec success.
- Keep `explorer_fast` on `gpt-5.3-codex-spark` for file/codebase search only.
- Raise a separate Linear issue only for a validated problem not already covered by CO-341.

## Evidence
- Local CLI/model smoke: `codex-cli 0.124.0`; `codex exec --ephemeral --json -m gpt-5.5 "Reply with OK only."` returned `OK`.
- Targeted local config cleanup: stale feature keys and stale Computer Use notify path fixed in `/Users/kbediako/.codex/config.toml`.
- CO-341 validation: subagent `019dbbaf-b4cc-7791-a7ff-c8d262454e20` reported the issue is canonical and Linear relations/state are correct.
- Runtime canary: final `out/linear-co-341-codex-0124-gpt55-posture/manual/runtime-mode-canary-final/runtime-canary-summary.json` reports all four scenario checks `20/20` and `ready_for_default_flip=true`.
- Review/delegation: `codex-orchestrator review` ran under Codex `0.124.0`, `model: gpt-5.5`, appserver runtime, and `xhigh` at `.runs/linear-co-341-codex-0124-gpt55-posture/cli/2026-04-23T19-49-48-421Z-1c49182e/review/output.log`; delegated evidence manifests under `.runs/linear-co-341-codex-0124-gpt55-posture-delegation-evidence/cli/` succeeded.
- Pack smoke: `MCP_RUNNER_TASK_ID=linear-co-341-codex-0124-gpt55-posture npm run pack:smoke` passed with marketplace add/install/status coverage.
- Linear monitor: subagent `019dbbca-a03e-7c11-b4a0-430606643181` reports CO-337 is Done, CO-338 remains In Progress for the npm publish blocker, CO-340 remains Blocked pending CO-341/CO-342, and no new issue is warranted.
