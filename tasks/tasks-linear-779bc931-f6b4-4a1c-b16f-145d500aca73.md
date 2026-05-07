# Task Checklist - CO-492

- Linear Issue: `CO-492` / `779bc931-f6b4-4a1c-b16f-145d500aca73`
- MCP Task ID: `linear-779bc931-f6b4-4a1c-b16f-145d500aca73`
- PRD: `docs/PRD-linear-779bc931-f6b4-4a1c-b16f-145d500aca73.md`
- TECH_SPEC: `docs/TECH_SPEC-linear-779bc931-f6b4-4a1c-b16f-145d500aca73.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-779bc931-f6b4-4a1c-b16f-145d500aca73.md`
- Checklist mirror: `.agent/task/linear-779bc931-f6b4-4a1c-b16f-145d500aca73.md`
- Source anchor: `ctx:sha256:aeaf7bb89eb5a370f39d4f1098e89c80b5da6a6a29b77b1972ececf1cdb811f6#chunk:c000001`
- Prompt manifest: `.runs/linear-779bc931-f6b4-4a1c-b16f-145d500aca73-docs-packet/cli/2026-05-06T23-13-09-726Z-85d46883/manifest.json`

## Docs-First Packet
- [x] PRD created inside declared docs scope. Evidence: `docs/PRD-linear-779bc931-f6b4-4a1c-b16f-145d500aca73.md`.
- [x] TECH_SPEC created inside declared docs scope. Evidence: `docs/TECH_SPEC-linear-779bc931-f6b4-4a1c-b16f-145d500aca73.md`.
- [x] ACTION_PLAN created inside declared docs scope. Evidence: `docs/ACTION_PLAN-linear-779bc931-f6b4-4a1c-b16f-145d500aca73.md`.
- [x] Canonical spec created inside declared docs scope. Evidence: `tasks/specs/linear-779bc931-f6b4-4a1c-b16f-145d500aca73.md`.
- [x] Task checklist created inside declared docs scope. Evidence: `tasks/tasks-linear-779bc931-f6b4-4a1c-b16f-145d500aca73.md`.
- [x] Checklist mirror created inside declared docs scope. Evidence: `.agent/task/linear-779bc931-f6b4-4a1c-b16f-145d500aca73.md`.
- [x] Registry mirrors updated only inside declared docs scope. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.

## Source Payload
- [x] Prompt source anchor recorded. Evidence: `ctx:sha256:aeaf7bb89eb5a370f39d4f1098e89c80b5da6a6a29b77b1972ececf1cdb811f6#chunk:c000001`.
- [x] Prompt source payload path checked. Evidence: `.runs/linear-779bc931-f6b4-4a1c-b16f-145d500aca73-docs-packet/cli/2026-05-06T23-13-09-726Z-85d46883/memory/source-0/source.txt` was not present in this child checkout, so the packet uses the parent brief plus the existing CO-486 packet authority boundary.

## Protected Issue Terms
- [x] persisted `/goal`
- [x] goals feature
- [x] app-server APIs
- [x] model tools
- [x] provider-worker run evidence
- [x] manifest `goal_evidence`
- [x] workpad summary
- [x] `advisory_only`
- [x] Linear remains source of truth

## Acceptance
- [x] Packet preserves `authority=advisory_only`.
- [x] Packet requires `goal_evidence` to be optional provider-worker run evidence.
- [x] Packet requires unavailable, disabled, stale, complete, paused, budget-limited, or thread-mismatched goal capture to be non-blocking advisory context.
- [x] Packet explicitly rejects goal state as authority for Linear transitions, PR attachment, review handoff, ready-review success, merge closeout, hook recovery success, long-poll terminal status, hook/resume control integration, or TUI automation.
- [x] Packet leaves implementation code, tests, Linear state, workpad state, PR lifecycle, and review lifecycle parent-owned.

## CO-382 Fallback Decision Table
- Large-refactor decision: no larger authority refactor is warranted because this issue adds advisory run evidence and explicitly rejects lifecycle authority expansion.
- Minor-seam decision: retain the optional unavailable/non-current goal-evidence seam as a supported no-op evidence path, not as lifecycle authority.
- Contract name: Linear-first provider-worker lifecycle authority with optional advisory `goal_evidence`.
- Owning surface: provider-worker manifest and workpad evidence capture.
- Steady-state proof: Linear/workpad/PR/review/check evidence remains authoritative while `goal_evidence` only records advisory state or reason.
- Tests/docs: focused provider-worker manifest/workpad tests, command-runner manifest persistence tests, and the CO-492 docs packet.
- Non-expiring rationale: optional goal evidence can be absent or unavailable as a supported no-op state because goal evidence is not required for workflow authority.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Provider-worker `goal_evidence` | Goal evidence unavailable or non-current beside authoritative Linear/workpad evidence. | justify retaining fallback | CO-492 | capture source unavailable, disabled, stale, complete, or thread-mismatched | 2026-05-07 | 2026-05-07 | non-expiring supported no-op | separate approved authority redesign | focused provider-worker manifest/workpad tests |

## Validation
- [x] JSON parse for `tasks/index.json` and `docs/docs-freshness-registry.json`. Evidence: `node -e "JSON.parse(...)"` returned `json ok`.
- [x] Protected-term scan across packet files and registry mirrors. Evidence: scoped `rg` found persisted `/goal`, goals feature, app-server APIs, model tools, provider-worker run evidence, manifest `goal_evidence`, workpad summary, `advisory_only`, Linear remains source of truth, and the full authority rejection list.
- [x] Changed-file scope review against declared file scope. Evidence: `git status --short` listed only the six packet files plus `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
- [x] `git diff --check` plus new-file whitespace scan. Evidence: `git diff --check` exited 0 and the scoped trailing-whitespace script returned `trailing whitespace ok`.
- [ ] Parent-owned implementation, docs-review, full validation, PR lifecycle, and Linear handoff.

## Progress Log
- 2026-05-07: Bounded docs child lane created the CO-492 docs-first packet and registry mirrors only.

## Notes
- Do not edit implementation code or tests in this child lane.
- Do not call Linear mutation helpers from this child lane.
- Parent owns authoritative issue workspace, Linear state, workpad, PR lifecycle, implementation, validation, and patch import.
