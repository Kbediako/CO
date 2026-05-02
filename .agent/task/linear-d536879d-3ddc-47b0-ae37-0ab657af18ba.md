# Task Checklist - linear-d536879d-3ddc-47b0-ae37-0ab657af18ba

- Linear Issue: `CO-459` / `d536879d-3ddc-47b0-ae37-0ab657af18ba`
- MCP Task ID: `linear-d536879d-3ddc-47b0-ae37-0ab657af18ba`
- Primary PRD: `docs/PRD-linear-d536879d-3ddc-47b0-ae37-0ab657af18ba.md`
- TECH_SPEC: `tasks/specs/linear-d536879d-3ddc-47b0-ae37-0ab657af18ba.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-d536879d-3ddc-47b0-ae37-0ab657af18ba.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-d536879d-3ddc-47b0-ae37-0ab657af18ba.md`
- Shared source 0 anchor: `ctx:sha256:0601533a80ba224cdbbbb7e4622264b47264850eeeeda93cf956b12cebd305cb#chunk:c000001`
- Current origin manifest: `.runs/linear-d536879d-3ddc-47b0-ae37-0ab657af18ba-docs-packet/cli/2026-05-01T03-01-30-233Z-69dd6493/manifest.json`
- Source payload note: supplied source payload exists in the parent workspace and contains run/source metadata rather than the full issue body; this packet is anchored on the explicit child-lane contract plus current repo seam names.

## Docs-First
- [x] PRD drafted for stale top-level `provider_intake` versus fresh raw provider-intake snapshot authority. Evidence: `docs/PRD-linear-d536879d-3ddc-47b0-ae37-0ab657af18ba.md`.
- [x] TECH_SPEC drafted with protected terms, parity matrix, explicit non-goals, fallback/refactor decision, and parent-owned implementation seams. Evidence: `tasks/specs/linear-d536879d-3ddc-47b0-ae37-0ab657af18ba.md`, `docs/TECH_SPEC-linear-d536879d-3ddc-47b0-ae37-0ab657af18ba.md`.
- [x] ACTION_PLAN drafted for parent implementation and focused validation only. Evidence: `docs/ACTION_PLAN-linear-d536879d-3ddc-47b0-ae37-0ab657af18ba.md`.
- [x] `tasks/index.json` updated within the declared child-lane scope. Evidence: `tasks/index.json`.
- [x] Checklist mirrored to `.agent/task/linear-d536879d-3ddc-47b0-ae37-0ab657af18ba.md`. Evidence: `.agent/task/linear-d536879d-3ddc-47b0-ae37-0ab657af18ba.md`.
- [x] Pre-implementation issue-quality review recorded in the canonical spec. Evidence: `tasks/specs/linear-d536879d-3ddc-47b0-ae37-0ab657af18ba.md`.
- [x] `docs/TASKS.md` and docs-freshness registry were intentionally not edited because they are outside this child lane's declared file scope. Evidence: child-lane file-scope contract.

## Child-Lane Scope
- [x] Child lane stayed inside the declared docs/checklist file scope. Evidence: final diff.
- [x] Child lane did not edit implementation or test files. Evidence: final diff.
- [x] Child lane did not mutate Linear, GitHub, workpad, or PR lifecycle state. Evidence: this checklist and final diff.
- [x] Child lane did not run full repo validation suites. Evidence: validation section below.
- [x] Child lane leaves changes uncommitted for parent patch export. Evidence: `git status --short`.

## Implementation Acceptance
- [ ] Top-level `provider_intake` no longer presents stale summary/cache data when fresh raw `provider-intake-state.json` is available.
- [ ] `co-status --format json`, `/api/v1/state`, and `/ui/data.json` agree on selected issue, concurrent-claim truth, and active/running/released states from the same fresh raw provider-intake snapshot authority.
- [ ] Active/running/released states remain distinct and are not flattened to make the surfaces agree.
- [ ] `CO-243 regression/follow-up` remains a baseline for concurrent-claim truth without widening CO-459 into a broad concurrency redesign.
- [ ] `CO-455 timeout-only adjacency` remains out of scope and is not implemented through this lane.
- [ ] Parent implementation does not use manual relaunch or destructive `provider-intake-state.json` cleanup as the primary repair.

## Validation
- [x] Child scoped JSON parse check. Evidence: `node -e "JSON.parse(require('fs').readFileSync('tasks/index.json','utf8'));"`.
- [x] Child scoped protected-term check over the packet and mirrors. Evidence: `rg -n "co-status --format json|/api/v1/state|/ui/data\\.json|provider_intake|provider-intake-state\\.json|stale summary/cache data|fresh raw provider-intake snapshot|selected issue|concurrent-claim truth|active/running/released states|CO-243 regression/follow-up|CO-455 timeout-only adjacency" docs/PRD-linear-d536879d-3ddc-47b0-ae37-0ab657af18ba.md docs/TECH_SPEC-linear-d536879d-3ddc-47b0-ae37-0ab657af18ba.md docs/ACTION_PLAN-linear-d536879d-3ddc-47b0-ae37-0ab657af18ba.md tasks/specs/linear-d536879d-3ddc-47b0-ae37-0ab657af18ba.md tasks/tasks-linear-d536879d-3ddc-47b0-ae37-0ab657af18ba.md .agent/task/linear-d536879d-3ddc-47b0-ae37-0ab657af18ba.md`.
- [x] Child scoped whitespace / diff check on touched files. Evidence: `git diff --check -- docs/PRD-linear-d536879d-3ddc-47b0-ae37-0ab657af18ba.md docs/TECH_SPEC-linear-d536879d-3ddc-47b0-ae37-0ab657af18ba.md docs/ACTION_PLAN-linear-d536879d-3ddc-47b0-ae37-0ab657af18ba.md tasks/specs/linear-d536879d-3ddc-47b0-ae37-0ab657af18ba.md tasks/tasks-linear-d536879d-3ddc-47b0-ae37-0ab657af18ba.md .agent/task/linear-d536879d-3ddc-47b0-ae37-0ab657af18ba.md tasks/index.json`.
- [ ] Parent focused `ProviderIntakeState.test.ts` regression for stale summary/cache data versus fresh raw provider-intake snapshot authority.
- [ ] Parent focused `ControlRuntime.test.ts` and status/API/UI projection regressions for `co-status --format json`, `/api/v1/state`, and `/ui/data.json`.
- [ ] Parent CO-243 baseline regression or no-regression proof.
- [ ] Parent CO-455 timeout-only boundary proof or no-touch proof.
- [ ] Parent docs-review before implementation.
- [ ] Parent-selected scoped validation after source edits.

## Progress Log
- 2026-05-01: bounded same-issue child lane created the `CO-459` docs-first packet and checklist mirrors against source anchor `ctx:sha256:0601533a80ba224cdbbbb7e4622264b47264850eeeeda93cf956b12cebd305cb#chunk:c000001`. The supplied source payload was available in the parent workspace but contained run/source metadata rather than the full issue body, so the packet is anchored on protected child-lane wording and current repo seam names only. Protected-term grep evidence is recorded above and covers `co-status --format json`, `/api/v1/state`, `/ui/data.json`, `provider_intake`, `provider-intake-state.json`, stale summary/cache data, fresh raw provider-intake snapshot, selected issue, concurrent-claim truth, active/running/released states, `CO-243 regression/follow-up`, and `CO-455 timeout-only adjacency`.
