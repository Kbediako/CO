# Task Checklist - linear-3ed4e0c0-4a6a-428b-bf31-d6252f230377

- Linear Issue: `CO-443`
- MCP Task ID: `linear-3ed4e0c0-4a6a-428b-bf31-d6252f230377`
- Primary PRD: `docs/PRD-linear-3ed4e0c0-4a6a-428b-bf31-d6252f230377.md`
- TECH_SPEC: `tasks/specs/linear-3ed4e0c0-4a6a-428b-bf31-d6252f230377.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-3ed4e0c0-4a6a-428b-bf31-d6252f230377.md`
- Child lane manifest: `.runs/linear-3ed4e0c0-4a6a-428b-bf31-d6252f230377-docs-packet/cli/2026-04-30T06-34-58-998Z-34bebedf/manifest.json`
- Source anchor: `ctx:sha256:cf913ea2dcd62e7ac2df8f89fd2725b8eb43ade503dd23e7c55ae65d81ad7cc7#chunk:c000001`

## Docs-First
- [x] Source payload availability checked without querying Linear. Evidence: the parent-provided source payload path is absent in this child checkout; packet uses the parent prompt and source anchor only.
- [x] PRD drafted for CO-443 completed intake claim live-truth recovery. Evidence: `docs/PRD-linear-3ed4e0c0-4a6a-428b-bf31-d6252f230377.md`.
- [x] Canonical TECH_SPEC drafted with issue-shaping contract, parity matrix, Not Done If criteria, fallback/refactor decision, and validation plan. Evidence: `tasks/specs/linear-3ed4e0c0-4a6a-428b-bf31-d6252f230377.md`.
- [x] ACTION_PLAN drafted for packet creation and parent-owned implementation follow-on. Evidence: `docs/ACTION_PLAN-linear-3ed4e0c0-4a6a-428b-bf31-d6252f230377.md`.
- [x] Canonical TECH_SPEC registered in `tasks/index.json`. Evidence: `tasks/index.json`.

## Acceptance Criteria
- [x] Packet states that completed provider-intake claims with `provider_issue_run_already_completed` must not suppress supported `control-host recover|relaunch|nudge` when live Linear truth is active/fresher again. Evidence: PRD and TECH_SPEC.
- [x] Packet preserves unchanged/equal completed-run no-op behavior so duplicate provider-worker runs are not reintroduced. Evidence: PRD, TECH_SPEC, and ACTION_PLAN.
- [x] Packet keeps completed provider-intake rows audit-visible and rejects manual `provider-intake-state.json` edits as the fix. Evidence: PRD and TECH_SPEC.
- [x] Packet preserves CO-393 root control-host provenance and direct-start guard contracts. Evidence: PRD, TECH_SPEC, and ACTION_PLAN.
- [x] Packet explicitly rejects widening into `CO-330` stale-owner recovery, `CO-393` command plumbing, `CO-404` timeout acknowledgement, `CO-406` no-run capacity, `CO-392` released-pending-reopen, direct `provider-linear-worker` starts, or manual provider-intake-state edits. Evidence: PRD, TECH_SPEC, ACTION_PLAN, and registry summary.

## Validation
- [x] `tasks/index.json` parses after registration. Evidence: `node -e "JSON.parse(require('fs').readFileSync('tasks/index.json', 'utf8')); console.log('tasks/index.json ok')"` returned `tasks/index.json ok`.
- [x] Scoped diff whitespace check over declared files passes. Evidence: `git diff --check -- docs/PRD-linear-3ed4e0c0-4a6a-428b-bf31-d6252f230377.md docs/ACTION_PLAN-linear-3ed4e0c0-4a6a-428b-bf31-d6252f230377.md tasks/specs/linear-3ed4e0c0-4a6a-428b-bf31-d6252f230377.md tasks/tasks-linear-3ed4e0c0-4a6a-428b-bf31-d6252f230377.md tasks/index.json` exited clean with no output, and `rg -n '[[:blank:]]$' ...` returned no trailing whitespace across the declared files.
- [x] Scoped diff review confirms no edits outside declared file scope. Evidence: `git status --short` listed only `tasks/index.json` plus the four untracked declared CO-443 packet files.

## Parent-Owned Follow-On
- [ ] Parent reconciles live Linear issue context before implementation. Evidence: pending parent lane.
- [ ] Parent runs docs-review or equivalent packet review before implementation. Evidence: pending parent lane.
- [ ] Parent implements stale completed-claim live-truth revalidation and focused regressions. Evidence: pending parent lane.
- [ ] Parent runs normal validation, standalone review, elegance pass, opens/updates PR, drains review, and transitions Linear handoff. Evidence: pending parent lane.

## Progress Log
- 2026-04-30: bounded same-issue child lane created the docs-first packet and `tasks/index.json` entry only.

## Notes
- The referenced source payload path was not present in this child checkout. This packet records the missing payload and relies on the parent-provided issue-shaping prompt and source anchor.
- Do not run Linear, GitHub, PR, workpad, issue-context, or lifecycle commands from this child lane.
- Do not edit implementation, test, package, existing unrelated docs, or `.agent` files from this child lane.
- Do not run full repo validation suites from this child lane.
