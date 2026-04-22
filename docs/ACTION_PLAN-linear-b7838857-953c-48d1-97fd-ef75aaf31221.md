# ACTION_PLAN - CO: stop child-lane paths from polluting trusted-project state in global ~/.codex/config.toml

## Added by Bounded Docs Child Lane 2026-04-22

## Summary
- Goal: finish `CO-307` by removing the child-lane launch/home/config seam that allows `trusted-project pollution`, `child-lane paths`, and `global ~/.codex/config.toml growth` without weakening trust boundaries.
- Scope:
  - docs-first packet and registry/checklist updates for `CO-307`
  - parent reproduction of the child-lane trust/config residue seam
  - parent-only implementation in the child-lane launch/home/config path
  - focused parent regressions and validation
- Assumptions:
  - the issue is bounded to ephemeral child-lane workspaces plus inherited `CODEX_HOME`
  - same-issue child lanes and parent-owned acceptance remain required
  - a narrow launch/home/config change can fix the residue without a broad global-config redesign

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: `trusted-project pollution`, `child-lane paths`, `global ~/.codex/config.toml growth`, `do not weaken trust boundaries`, `.child-lanes/<stream>-<run>`, `CODEX_HOME`, `~/.codex/config.toml`.
- Not done if:
  - ephemeral child-lane paths can still accumulate as durable trust/config state
  - the fix depends on weakening or bypassing trust boundaries
  - the parent-owned child-lane acceptance contract is altered or blurred
- Pre-implementation issue-quality review:
  - approved for docs packet drafting. Correctness depends on exact protected wording, the child-lane launch/home/config seam, and the explicit rejection of trust weakening, so the micro-task path is ineligible.

## Milestones & Sequencing
1. Land the CO-307 docs-first packet and registry/checklist updates, recording that the local child checkout lacks the `.runs/.../source-0/source.txt` payload.
2. Parent reproduces the trusted-project/config growth seam with bounded evidence, using the current child-lane launch path and a controlled `CODEX_HOME` observation point.
3. Parent implements the narrowest launch/home/config isolation change that prevents ephemeral child-lane paths from becoming durable global trust residue.
4. Parent adds focused regressions around child-lane workspace creation, `CODEX_HOME` propagation, and trust/config isolation behavior.
5. Parent runs focused validation and review, then completes normal handoff.

## Dependencies
- Child-lane launch seam:
  - `orchestrator/src/cli/providerLinearChildLaneRunner.ts`
  - `orchestrator/src/cli/providerLinearChildLaneShell.ts`
  - `orchestrator/src/cli/utils/codexPaths.ts`
- Parent/launch env seam:
  - `orchestrator/src/cli/providerLinearWorkerRunner.ts`
  - `orchestrator/src/cli/controlHostCliShell.ts`
- Focused tests:
  - `orchestrator/tests/ProviderLinearChildLaneRunner.test.ts`
  - `orchestrator/tests/ProviderLinearChildLaneShell.test.ts`
  - `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`
  - `orchestrator/tests/ControlHostCliShell.test.ts`

## Validation
- Child scoped:
  - `node -e "JSON.parse(require('node:fs').readFileSync('tasks/index.json','utf8')); console.log('json ok')"`
  - `git diff --check -- docs/PRD-linear-b7838857-953c-48d1-97fd-ef75aaf31221.md docs/TECH_SPEC-linear-b7838857-953c-48d1-97fd-ef75aaf31221.md docs/ACTION_PLAN-linear-b7838857-953c-48d1-97fd-ef75aaf31221.md tasks/specs/linear-b7838857-953c-48d1-97fd-ef75aaf31221.md tasks/tasks-linear-b7838857-953c-48d1-97fd-ef75aaf31221.md .agent/task/linear-b7838857-953c-48d1-97fd-ef75aaf31221.md tasks/index.json docs/TASKS.md`
- Parent focused:
  - reproduction evidence for the trust/config growth seam
  - focused child-lane launch/runtime tests on the touched seams
  - parent docs-review / implementation-gate as required
  - normal parent validation floor before PR handoff
- Rollback plan:
  - revert the bounded launch/home/config change if it weakens trust or breaks required child-lane runtime behavior

## Risks & Mitigations
- Risk: a naive fix disables trust checks instead of isolating residue.
  - Mitigation: keep "do not weaken trust boundaries" as a hard packet constraint and review gate.
- Risk: changing `CODEX_HOME` behavior breaks session-log or runtime expectations.
  - Mitigation: keep the change narrow and cover it with focused child-lane runner tests.
- Risk: the issue broadens into generic global config redesign.
  - Mitigation: keep scope anchored on ephemeral child-lane paths plus inherited `CODEX_HOME`.

## Approvals
- Reviewer: pending parent docs-review and parent implementation validation
- Date: 2026-04-22
