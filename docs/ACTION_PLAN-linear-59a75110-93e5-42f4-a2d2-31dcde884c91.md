# ACTION_PLAN - CO: prevent local Node OOM under concurrent provider-worker pressure and provenance-invalid retry churn

## Summary
- Goal: give the parent lane an implementation-ready docs packet for the bounded local host-safety fix behind `CO-299`.
- Scope: PRD, canonical TECH_SPEC, TECH_SPEC mirror, ACTION_PLAN, task checklists, `tasks/index.json`, and `docs/TASKS.md` only.
- Assumptions:
  - the parent-provided issue source anchor and live issue description are canonical because the prompt-supplied `.runs/.../source.txt` path is unavailable in this child checkout
  - parent owns implementation, tests, registry follow-on, Linear state, workpad, and PR lifecycle
  - `docs/docs-freshness-registry.json` remains parent-owned because it is outside this lane's declared file scope

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `SIGABRT`
  - `V8 OOM`
  - `provider_worker_child_lane_provenance_invalid`
  - `provenance-invalid retry churn`
  - `provider-worker`
  - `child-lane`
  - `backpressure`
  - `host-safety`
  - `fail closed`
- Not done if:
  - repeated `provenance-invalid retry churn` remains possible under local multi-worker pressure
  - operators can still hit local Node OOM without earlier bounded safety response or explicit observability signal
  - the fix broadens retries or masks the host-pressure truth
- Pre-implementation issue-quality review:
  - current repo seams already separate adjacent concerns: `CO-125` covers shared concurrency admission, `CO-244` covers fail-closed provenance recording, and `CO-79` covers deterministic same-attempt retry suppression
  - `CO-299` is the combined local host-pressure and noisy provenance-invalid churn seam, so a micro-task path is not appropriate
  - generic refresh-stall or outage framing is explicitly rejected

## Milestones & Sequencing
1. Draft the bounded docs-first packet and task mirrors under `linear-59a75110-93e5-42f4-a2d2-31dcde884c91`.
2. Register the packet in `tasks/index.json` and `docs/TASKS.md`, and record that `docs/docs-freshness-registry.json` remains parent-owned because it is outside this lane's scope.
3. Parent reproduces or simulates the local multi-worker pressure shape, including repeated provenance-invalid child-lane attempts.
4. Parent implements bounded `host-safety` suppression and tighter local `backpressure` at the smallest correct admission or child-lane seam.
5. Parent wires explicit observability for suppression reasons without weakening `fail closed` provenance behavior.
6. Parent reruns the reproduction and focused tests, then completes the normal review and PR workflow.

## Parent-Owned Implementation Tracks
1. Local pressure reproduction:
   - create a bounded local reproduction or simulation that combines long-lived `provider-worker` occupancy with repeated provenance-invalid child-lane attempts
   - capture enough evidence to show the pre-fix path can otherwise trend toward `SIGABRT` / `V8 OOM`
2. Admission and backpressure containment:
   - tighten local start or resume and extra-lane admission rules so new work is suppressed before unbounded local pressure builds
   - keep the behavior local-host scoped and do not mutate active work just to restore headroom
3. Same-minute churn suppression:
   - keep `provider_worker_child_lane_provenance_invalid` authoritative
   - prevent the same parent or issue from repeatedly surfacing the same provenance-invalid retry or progress noise inside one bounded window unless state or evidence changed
4. Observability:
   - expose an explicit host-safety suppression signal in the read model or status surfaces
   - preserve the underlying provenance-invalid reason so operators can still diagnose the root cause

## Dependencies
- Source anchor `ctx:sha256:0320d3a6b57e0f8847509632a1b1cf89ffd868f1412cbb569e67ac7eb380f394#chunk:c000001`
- `docs/PRD-linear-e122d053-40f2-4246-9648-81c9001715f1.md`
- `tasks/specs/linear-104aa410-5c94-457c-bbce-9962c7308ac5.md`
- `tasks/specs/linear-486fd104-53d7-4657-b26f-c477f7e730a3.md`
- `orchestrator/src/cli/control/providerIssueHandoff.ts`
- `orchestrator/src/cli/providerLinearChildLaneShell.ts`
- `orchestrator/src/cli/control/providerIssueObservability.ts`

## Validation
- Checks / tests:
  - child lane: `python3 -c 'import json, pathlib; json.loads(pathlib.Path(\"tasks/index.json\").read_text())'`
  - child lane: protected-term grep across the owned packet files
  - child lane: scoped git diff review
  - parent lane: bounded local pressure reproduction or simulation
  - parent lane: focused regressions in the admission, child-lane, and observability seams actually touched
  - parent lane: normal validation and review flow after implementation
- Rollback plan:
  - revert only the CO-299 packet and registry-mirror edits if the parent source reconciliation changes the issue shape before implementation

## Risks & Mitigations
- Risk: the implementation drifts into a generic refresh-stall or outage explanation.
  - Mitigation: keep the packet explicit that the problem is local Node pressure plus provenance-invalid churn, not a generic restart-required lane.
- Risk: the fix weakens provenance validation to reduce noise.
  - Mitigation: keep `provider_worker_child_lane_provenance_invalid` protected and require `fail closed` behavior in every packet artifact.
- Risk: the implementation hides pressure by muting retries or lowering concurrency without proof.
  - Mitigation: require bounded reproduction or simulation plus explicit observability before calling the issue done.
- Risk: parent assumes this child lane updated the docs freshness registry.
  - Mitigation: every packet file states that `docs/docs-freshness-registry.json` is outside this lane's declared scope.

## Approvals
- Docs-first packet: bounded same-issue docs child lane, 2026-04-22
- Parent docs-review and implementation approval: pending
