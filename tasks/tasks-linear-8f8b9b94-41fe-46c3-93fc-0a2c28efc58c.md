# Task Checklist - linear-8f8b9b94-41fe-46c3-93fc-0a2c28efc58c

- Linear Issue: `CO-222` / `8f8b9b94-41fe-46c3-93fc-0a2c28efc58c`
- MCP Task ID: `linear-8f8b9b94-41fe-46c3-93fc-0a2c28efc58c`
- Primary PRD: `docs/PRD-linear-8f8b9b94-41fe-46c3-93fc-0a2c28efc58c.md`
- TECH_SPEC: `tasks/specs/linear-8f8b9b94-41fe-46c3-93fc-0a2c28efc58c.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-8f8b9b94-41fe-46c3-93fc-0a2c28efc58c.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-8f8b9b94-41fe-46c3-93fc-0a2c28efc58c.md`
- Shared source 0 anchor: `ctx:sha256:6c2fdaf4cabe0fb0a183c2574b434ee4b063ceab0a04e0e592aad4c44d81b205#chunk:c000001`
- Current origin manifest: `.runs/linear-8f8b9b94-41fe-46c3-93fc-0a2c28efc58c-co222-docs-packet/cli/2026-04-17T16-32-33-651Z-8f6278d1/manifest.json`

## Docs-First
- [x] PRD drafted for resumed provider-worker runs after a failed prior attempt with explicit retry acceptance, control-host refresh failure history, control-host intake, manifest/proof/summary truth reconciliation, and `CO STATUS` scope. Evidence: `docs/PRD-linear-8f8b9b94-41fe-46c3-93fc-0a2c28efc58c.md`.
- [x] TECH_SPEC drafted with the protected terms, parity matrix current/reference/target contract, explicit non-goals, and parent-owned implementation seams. Evidence: `tasks/specs/linear-8f8b9b94-41fe-46c3-93fc-0a2c28efc58c.md`, `docs/TECH_SPEC-linear-8f8b9b94-41fe-46c3-93fc-0a2c28efc58c.md`.
- [x] ACTION_PLAN drafted for parent implementation and focused validation only. Evidence: `docs/ACTION_PLAN-linear-8f8b9b94-41fe-46c3-93fc-0a2c28efc58c.md`.
- [x] `tasks/index.json` and `docs/TASKS.md` updated within the declared docs scope. Evidence: those files.
- [x] Checklist mirrored to `.agent/task/linear-8f8b9b94-41fe-46c3-93fc-0a2c28efc58c.md`. Evidence: `.agent/task/linear-8f8b9b94-41fe-46c3-93fc-0a2c28efc58c.md`.
- [x] Pre-implementation issue-quality review recorded in the canonical spec. Evidence: `tasks/specs/linear-8f8b9b94-41fe-46c3-93fc-0a2c28efc58c.md`.

## Child-Lane Scope
- [x] Child lane stayed inside the declared docs file scope. Evidence: final diff.
- [x] Child lane did not edit implementation or test files. Evidence: final diff.
- [x] Child lane did not mutate Linear state or workpad. Evidence: this checklist and final diff.
- [x] Child lane did not run full repo validation suites. Evidence: validation section below.
- [x] Child lane leaves changes uncommitted for parent patch export. Evidence: `git status --short`.

## Implementation Acceptance
- [ ] Resumed provider-worker runs become authoritative after a failed prior attempt once current control-host intake plus current run evidence prove the resumed lane is current.
- [ ] Retry acceptance follows the authoritative resumed run instead of stale failed-attempt residue.
- [ ] Control-host refresh failure history remains auditable without outranking current resumed-run truth.
- [ ] Manifest/proof/summary truth reconciliation selects the same current authoritative attempt used by retry acceptance and control-host intake.
- [ ] `CO STATUS` reports the authoritative resumed provider-worker run instead of the failed prior attempt.
- [ ] Failed prior attempt evidence remains retained for audit/debug and is not destructively deleted as part of the fix.

## Validation
- [x] Child scoped JSON parse check. Evidence: `python3 - <<'PY'\nimport json, pathlib\njson.loads(pathlib.Path('tasks/index.json').read_text())\nPY`.
- [x] Child scoped protected-term check over the packet and mirrors. Evidence: `rg -n "resumed provider-worker runs|failed prior attempt|retry acceptance|control-host refresh failure history|control-host intake|CO STATUS|manifest/proof/summary truth reconciliation|parity matrix current/reference/target contract" docs/PRD-linear-8f8b9b94-41fe-46c3-93fc-0a2c28efc58c.md docs/TECH_SPEC-linear-8f8b9b94-41fe-46c3-93fc-0a2c28efc58c.md docs/ACTION_PLAN-linear-8f8b9b94-41fe-46c3-93fc-0a2c28efc58c.md tasks/specs/linear-8f8b9b94-41fe-46c3-93fc-0a2c28efc58c.md tasks/tasks-linear-8f8b9b94-41fe-46c3-93fc-0a2c28efc58c.md .agent/task/linear-8f8b9b94-41fe-46c3-93fc-0a2c28efc58c.md`.
- [x] Child scoped whitespace / diff check on touched files. Evidence: `git diff --check -- docs/PRD-linear-8f8b9b94-41fe-46c3-93fc-0a2c28efc58c.md docs/TECH_SPEC-linear-8f8b9b94-41fe-46c3-93fc-0a2c28efc58c.md docs/ACTION_PLAN-linear-8f8b9b94-41fe-46c3-93fc-0a2c28efc58c.md tasks/specs/linear-8f8b9b94-41fe-46c3-93fc-0a2c28efc58c.md tasks/tasks-linear-8f8b9b94-41fe-46c3-93fc-0a2c28efc58c.md .agent/task/linear-8f8b9b94-41fe-46c3-93fc-0a2c28efc58c.md tasks/index.json docs/TASKS.md`.
- [ ] Parent focused retry-acceptance and control-host intake reconciliation regressions.
- [ ] Parent focused manifest/proof/summary truth reconciliation and `CO STATUS` regressions.
- [ ] Parent docs-review before implementation.
- [ ] Parent-selected scoped validation after source edits.

## Progress Log
- 2026-04-18: bounded same-issue child lane created the `CO-222` docs-first packet and registry mirrors against source anchor `ctx:sha256:6c2fdaf4cabe0fb0a183c2574b434ee4b063ceab0a04e0e592aad4c44d81b205#chunk:c000001`. The expected shared source payload was absent in this child checkout, so the packet is anchored on the protected handoff wording only: `resumed provider-worker runs`, `failed prior attempt`, `retry acceptance`, `control-host refresh failure history`, `control-host intake`, `CO STATUS`, `manifest/proof/summary truth reconciliation`, and the parity matrix current/reference/target contract.
