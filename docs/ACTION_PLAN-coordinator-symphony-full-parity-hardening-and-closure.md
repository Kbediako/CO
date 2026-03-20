# ACTION_PLAN - Coordinator Symphony Full-Parity Hardening and Closure

## Added by Bootstrap (refresh as needed)

## Summary
- Goal: Deliver the remaining Symphony parity blockers as a new `1311` hardening lane rather than diluting the completed `1310` audit packet, and keep residual blockers explicit when full closure is not yet truthful.
- Scope: docs/spec lock, workspace substrate, provider lifecycle reconcile plus continuation, and observability/UI parity.
- Assumptions:
  - `/Users/kbediako/Code/symphony/SPEC.md` is the parity authority when upstream spec and Elixir behavior differ
  - existing provider setup stays in place for live proof
  - tracker writes remain out of core blocker scope

## Milestones & Sequencing
1) Docs-first program lock
   - create the `1311` PRD, TECH_SPEC, ACTION_PLAN, findings doc, checklist mirror, and registry entries
   - correct stale `1310` status metadata so the new lane does not blur the merged audit closeout
   - run docs-review and record the manifest
2) Workspace substrate
   - introduce deterministic per-issue workspace identity and child-run launch confinement
   - persist workspace metadata in manifests and read models
   - remove shared-repo-root execution from the provider-start path
3) Provider lifecycle reconcile plus continuation
   - widen lifecycle state ownership across claims, retries, completion, and release
   - add running-issue reconcile behavior for child-run terminal state and provider state changes
   - implement true continuation behavior while the issue remains active
   - align issue eligibility with the upstream scheduler contract as far as this branch can do truthfully, and record any remaining breadth gaps explicitly
4) Observability and UI parity
   - expose workspace, lifecycle, retry, continuation, and refresh state through selected-run and compatibility surfaces
   - return truthful `null` values for turn/token/rate-limit fields that do not yet have authoritative capture
   - update the status UI to present the richer operator context that is actually authoritative on this branch
5) Closeout
   - rerun the full validation chain
   - capture live provider proof
   - handle review feedback, merge the hardening tranche, and return to a clean `main` while keeping `1311` in progress if residual parity blockers remain

## Dependencies
- `/Users/kbediako/Code/symphony/SPEC.md`
- `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/orchestrator.ex`
- `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/agent_runner.ex`
- `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/workspace.ex`
- existing CO provider/control-host surfaces in `orchestrator/src/cli/control*`

## Validation
- Checks / tests:
  - `npx codex-orchestrator start docs-review --format json --no-interactive --task 1311-coordinator-symphony-full-parity-hardening-and-closure`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - focused lifecycle/workspace tests
  - full repo gate chain before PR handoff
- Rollback plan:
  - keep workspace substrate, lifecycle state machine, and UI parity in separate commits where possible
  - do not merge false parity claims; if live proof fails or residual blockers remain, keep `1311` in progress and update the packet truthfully

## Risks & Mitigations
- Workspace provisioning can destabilize child-run startup.
  - Mitigation: fail closed, persist workspace identity, and add focused tests before live proof.
- Lifecycle reconcile and continuation share hot files and can cause state drift if split badly.
  - Mitigation: keep them in one bounded implementation stream and validate with real provider transitions.
- UI parity can race ahead of backend truth.
  - Mitigation: land observability/UI changes only after workspace and lifecycle semantics are authoritative.

## Approvals
- Reviewer: Codex (top-level orchestrator)
- Date: 2026-03-20
