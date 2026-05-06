# ACTION_PLAN - CO-455 attach timeout with healthy lower-authority evidence

## Summary
- Goal: give the parent lane a bounded plan for `co-status --format json` attach reads that hit `control-host ui request timeout after 15000ms` while `provider-intake-state.json` and worker manifest heartbeats remain healthy.
- Scope: docs-first packet, checklist mirrors, `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`, parent-owned implementation, and parent-owned focused validation.
- Assumptions:
  - the supplied source payload contains run/source metadata rather than the full issue body
  - the explicit child-lane contract is the issue-shaping authority for this docs packet
  - the smallest correct parent fix is a degraded-read classification in the attach/status read path, not CO-459 stale `provider_intake` projection, CO-468 accepted no-run recovery, CO-407 direct JSON timeout budget, broad provider admission policy, or manual provider-intake artifact edits

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `co-status --format json`
  - `control-host ui request timeout after 15000ms`
  - `provider-intake-state.json`
  - `worker manifest heartbeats`
  - `stale endpoint rotation`
  - `stale control-host owner reclamation`
  - `/ui/data.json`
  - `truthful degraded-read status`
  - `no fabricated coherent status`
- Not done if:
  - `co-status --format json` fabricates a coherent status after `/ui/data.json` times out
  - timeout-only evidence triggers stale endpoint rotation or stale control-host owner reclamation despite healthy lower-authority evidence
  - parent fixes this by editing `provider-intake-state.json` or other provider-intake artifacts manually
  - parent widens into CO-459, CO-468, CO-407, broad provider admission policy, or manual provider-intake artifact edits
- Pre-implementation issue-quality review:
  - 2026-05-05: the lane is correctly shaped as attach-read timeout classification with healthy lower-authority evidence. It is not narrower than the user request because it carries the protected terms, explicit non-goals, and current/reference/target parity across status, `/ui/data.json`, lower-authority evidence, stale endpoint rotation, and stale control-host owner reclamation surfaces.
- Fallback / refactor decision: this task touches timeout and stale recovery behavior. Decision is `remove fallback` for treating `control-host ui request timeout after 15000ms` as stale endpoint or stale owner truth when lower authority is healthy; `justify retaining fallback` for `provider-intake-state.json` and worker manifest heartbeats as lower-authority diagnostic support; and `justify retaining fallback` for stale endpoint rotation and stale control-host owner reclamation only when stale/dead evidence exists.

## Milestones & Sequencing
1. Create the CO-455 docs-first packet and checklist mirrors within the declared child-lane file scope.
2. Parent refreshes live `linear issue-context` and confirms CO-455 still owns attach timeout with healthy lower-authority evidence.
3. Parent audits the `co-status --format json` attach read path and `/ui/data.json` request timeout behavior.
4. Parent audits lower-authority reads from `provider-intake-state.json` and worker manifest heartbeats.
5. Parent identifies the stale endpoint rotation and stale control-host owner reclamation predicates.
6. Parent implements the smallest degraded-read classification so `control-host ui request timeout after 15000ms` stays visible and lower-authority evidence remains source-labeled.
7. Parent ensures no timeout-only stale endpoint rotation or stale control-host owner reclamation fires when lower authority is healthy.
8. Parent confirms no fabricated coherent status is produced from lower-authority pieces.
9. Parent confirms CO-459, CO-468, CO-407, broad provider admission policy, and manual provider-intake artifact edits remain out of scope.
10. Parent runs focused validation and carries the packet into docs-review, implementation review, PR, and Linear closeout.

## Dependencies
- Shared source anchor: `ctx:sha256:4c0a0f86311a384399aff1273a95e9e72eed60adf0127cd70616e736d4088164#chunk:c000001`
- Origin manifest: `.runs/linear-dd2af462-08ae-4ea2-aa53-92000f06952a-docs-packet/cli/2026-05-05T22-29-01-603Z-53a89036/manifest.json`
- Parent-owned likely surfaces:
  - `co-status --format json`
  - `/ui/data.json`
  - `provider-intake-state.json`
  - worker manifest heartbeats
  - attach-shell or control-host UI request timeout handling
  - stale endpoint rotation
  - stale control-host owner reclamation

## Validation
- Child lane only:
  - `node -e "JSON.parse(require('fs').readFileSync('tasks/index.json','utf8'));"`
  - `node -e "JSON.parse(require('fs').readFileSync('docs/docs-freshness-registry.json','utf8'));"`
  - `rg -n "co-status --format json|control-host ui request timeout after 15000ms|provider-intake-state\\.json|worker manifest heartbeats|stale endpoint rotation|stale control-host owner reclamation|/ui/data\\.json|truthful degraded-read status|no fabricated coherent status|CO-459 stale provider_intake projection|CO-468 accepted no-run recovery|CO-407 direct JSON timeout budget|broad provider admission policy|manual provider-intake artifact edits" docs/PRD-linear-dd2af462-08ae-4ea2-aa53-92000f06952a.md docs/TECH_SPEC-linear-dd2af462-08ae-4ea2-aa53-92000f06952a.md docs/ACTION_PLAN-linear-dd2af462-08ae-4ea2-aa53-92000f06952a.md tasks/specs/linear-dd2af462-08ae-4ea2-aa53-92000f06952a.md tasks/tasks-linear-dd2af462-08ae-4ea2-aa53-92000f06952a.md .agent/task/linear-dd2af462-08ae-4ea2-aa53-92000f06952a.md`
  - `git diff --check -- docs/PRD-linear-dd2af462-08ae-4ea2-aa53-92000f06952a.md docs/TECH_SPEC-linear-dd2af462-08ae-4ea2-aa53-92000f06952a.md docs/ACTION_PLAN-linear-dd2af462-08ae-4ea2-aa53-92000f06952a.md tasks/specs/linear-dd2af462-08ae-4ea2-aa53-92000f06952a.md tasks/tasks-linear-dd2af462-08ae-4ea2-aa53-92000f06952a.md .agent/task/linear-dd2af462-08ae-4ea2-aa53-92000f06952a.md tasks/index.json docs/TASKS.md docs/docs-freshness-registry.json`
- Parent implementation lane:
  - focused attach-timeout regression for `control-host ui request timeout after 15000ms`
  - focused degraded-read status proof for `co-status --format json`
  - focused lower-authority health proof for `provider-intake-state.json` and worker manifest heartbeats
  - focused no-trigger proof for stale endpoint rotation and stale control-host owner reclamation
  - no-touch or boundary proof for CO-459, CO-468, CO-407, broad provider admission policy, and manual provider-intake artifact edits
  - parent docs-review before implementation

## Risks & Mitigations
- Risk: parent fixes the timeout by fabricating a coherent status from lower-authority evidence.
  - Mitigation: keep no fabricated coherent status protected in spec, checklist, and focused validation.
- Risk: parent conflates CO-455 with CO-407 direct JSON timeout budget.
  - Mitigation: preserve the exact attach `control-host ui request timeout after 15000ms` scope and reject direct JSON budget changes.
- Risk: parent conflates lower-authority provider-intake evidence with CO-459 stale `provider_intake` projection.
  - Mitigation: keep provider-intake as health evidence only and reject stale projection repair.
- Risk: parent broadens into provider admission or CO-468 no-run recovery.
  - Mitigation: keep acceptance limited to degraded-read classification and stale endpoint/owner non-trigger behavior.

## Approvals
- Docs packet child lane: `.runs/linear-dd2af462-08ae-4ea2-aa53-92000f06952a-docs-packet/cli/2026-05-05T22-29-01-603Z-53a89036/manifest.json`
- Parent docs-review: pending parent acceptance
- Parent implementation/review/PR lifecycle: pending parent lane
