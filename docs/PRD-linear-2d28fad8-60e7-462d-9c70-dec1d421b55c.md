# PRD - CO-556 auto-restart or fail closed on stale resident code

## Traceability
- Linear issue: `CO-556` / `2d28fad8-60e7-462d-9c70-dec1d421b55c`
- Linear URL: https://linear.app/asabeko/issue/CO-556
- Task registry id: `20260520-linear-2d28fad8-60e7-462d-9c70-dec1d421b55c`
- MCP Task ID: `linear-2d28fad8-60e7-462d-9c70-dec1d421b55c`
- Canonical owner key: `control-host:stale-resident-code-auto-restart-fail-closed`
- Canonical TECH_SPEC: `tasks/specs/linear-2d28fad8-60e7-462d-9c70-dec1d421b55c.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-2d28fad8-60e7-462d-9c70-dec1d421b55c.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-2d28fad8-60e7-462d-9c70-dec1d421b55c.md`
- Task checklist: `tasks/tasks-linear-2d28fad8-60e7-462d-9c70-dec1d421b55c.md`
- Agent task mirror: `.agent/task/linear-2d28fad8-60e7-462d-9c70-dec1d421b55c.md`
- Source anchor: `ctx:sha256:ae0909adb0536f00cad4a362edd1e495157b446bb95ab0c17655b489a548065f#chunk:c000001`
- Source object id: `sha256:ae0909adb0536f00cad4a362edd1e495157b446bb95ab0c17655b489a548065f`
- Source manifest: `.runs/linear-2d28fad8-60e7-462d-9c70-dec1d421b55c-docs-packet/cli/2026-05-20T00-20-24-774Z-cc622583/manifest.json`
- Source payload note: this child checkout has no `.runs` tree at its root; the source payload was read in read-only mode from the parent-relative path `../../.runs/linear-2d28fad8-60e7-462d-9c70-dec1d421b55c-docs-packet/cli/2026-05-20T00-20-24-774Z-cc622583/memory/source-0/source.txt` and contains run/issue provenance only. The issue-shaping contract below is anchored on the parent-provided CO-556 wording.

## Summary
- Problem Statement: once CO-515 makes `supervised control-host source freshness` trustworthy, the resident control-host still needs a governed policy for stale resident code. If `control-host-owner.json` or `co-status --format json` shows `source_root_freshness` behind `origin/main`, the provider-worker control plane must not continue treating active WIP as safely actionable on stale code.
- Desired Outcome: stale resident code triggers a bounded auto-restart when safe and auditable, or otherwise makes the control-host fail closed before it admits, resumes, retries, or reports provider-worker work as fresh. This must preserve `terminal Linear truth`, `provider-intake-state.json` audit evidence, and the CO-555 terminal-claim precedence.

## User Request Translation
- User intent / needs:
  - create the CO-556 docs-first packet and task registration for parent import
  - define the policy layer after CO-515 trustworthy source freshness detection
  - preserve exact surfaces and terms: `supervised control-host source freshness`, `control-host-owner.json`, `source_root_freshness`, stale resident code, `origin/main`, `provider-intake-state.json`, `co-status --format json`, terminal Linear truth, active WIP, auto-restart, and fail closed
  - make stale resident code stop provider-worker work from looking safe when the supervised source root is behind `origin/main`
- Success criteria / acceptance:
  - stale `source_root_freshness` in `control-host-owner.json` or `co-status --format json` becomes an actionable policy state, not just advisory text
  - a safe auto-restart path is bounded, observable, and tied to the exact stale source evidence that triggered it
  - when auto-restart is not safe, not available, or not proven, the control-host fails closed before treating active WIP as fresh
  - `provider-intake-state.json` remains audit evidence and is not manually deleted or rewritten to clear stale resident code
  - terminal Linear truth from CO-555 still wins before retry/resumable/active-WIP projection
- Constraints / non-goals:
  - child lane owns docs packet and registration only
  - parent owns implementation, focused tests, docs-review, Linear state, workpad, PR lifecycle, and final handoff
  - do not weaken CO-555 terminal-claim precedence
  - do not manually delete provider-intake state
  - do not duplicate CO-515 stale-source recompute/invalidation
  - do not reopen CO-458
  - do not broaden into all CO-552 drift invariants

## Intent Checksum
- Exact user wording / phrases to preserve:
  - `supervised control-host source freshness`
  - `control-host-owner.json`
  - `source_root_freshness`
  - stale resident code
  - `origin/main`
  - `provider-intake-state.json`
  - `co-status --format json`
  - terminal Linear truth
  - active WIP
  - auto-restart
  - fail closed
- Protected terms / exact artifact and surface names:
  - `control-host-owner.json`
  - `source_root_freshness`
  - `source_checkout.head`
  - `source_checkout.upstream`
  - `source_checkout.behind`
  - `origin/main`
  - `co-status --format json`
  - `/ui/data.json`
  - `provider-intake-state.json`
  - terminal Linear truth
  - active WIP
  - stale resident code
  - auto-restart
  - fail closed
  - CO-515 stale-source recompute/invalidation
  - CO-555 terminal-claim precedence
  - CO-458
  - CO-552 drift invariants
- Nearby wrong interpretations to reject:
  - restarting the host blindly whenever `origin/main` moves, without proving stale resident code
  - treating auto-restart as sufficient when restart outcome is unknown or the new source root is still stale
  - deleting or editing `provider-intake-state.json` to remove evidence of active WIP
  - weakening terminal Linear truth so a terminal issue can become active WIP again
  - reimplementing CO-515 freshness recompute or invalidation inside the policy lane
  - reopening CO-458 provenance work instead of using current `source_root_freshness`
  - expanding into every CO-552 drift invariant instead of this stale-resident-code control-host policy

## Parity / Alignment Matrix

| Surface | Current Truth | Reference Truth | Target Truth | Explicitly Out Of Scope |
| --- | --- | --- | --- | --- |
| `source_root_freshness` | CO-515 makes stale-source detection trustworthy after `origin/main` advances, but policy response is separate. | Stale source evidence should be authoritative enough to block unsafe provider-worker actions. | Stale `source_root_freshness` drives auto-restart when safe or fail closed when restart cannot be proven. | Recomputing source freshness from scratch. |
| `control-host-owner.json` | Owner state can carry source freshness and active worker evidence for a resident supervised control-host. | Owner state should not let stale resident code look healthy just because active WIP exists. | Owner state projects stale resident code as a policy blocker until restart success or fail-closed state is explicit. | Manual owner-file surgery. |
| `co-status --format json` | Operators can inspect source freshness and active WIP, but stale resident code policy may remain implicit. | JSON status should show why work is blocked, restarting, or failed closed. | Status names stale resident code, restart/fail-closed policy, and the source evidence that triggered it. | Hiding source freshness evidence to reduce noise. |
| `provider-intake-state.json` | Intake state may contain active WIP, retry, and audit history. | Intake evidence is separate from source freshness and terminal Linear truth. | Intake remains audit evidence while stale resident code blocks unsafe active-WIP handling. | Manual deletion or rewrite of provider-intake state. |
| Terminal Linear truth | CO-555 makes terminal issue metadata win before retry/resumable active-WIP claims. | Terminal Linear truth must remain the highest-precedence lifecycle signal. | CO-556 policy composes after terminal filtering and cannot revive terminal provider claims. | Weakening CO-555 or changing terminal-state semantics. |
| CO-552 drift invariants | Broader drift invariants may exist across control-host and provider-worker surfaces. | This lane is only the stale resident code policy tied to source freshness. | Parent keeps CO-556 narrow and files separate work for unrelated drift invariants. | Broad CO-552 invariant sweep. |

## Not Done If
- Stale resident code behind `origin/main` can still process, admit, resume, retry, or report active WIP as if the control-host source is fresh.
- `source_root_freshness` in `control-host-owner.json` or `co-status --format json` is stale, but the control-host neither auto-restarts nor fails closed.
- Auto-restart can loop or claim success without proving the supervised source root is current against `origin/main`.
- Fail closed is implemented by deleting or rewriting `provider-intake-state.json`.
- CO-555 terminal-claim precedence is weakened, allowing terminal Linear truth to be overridden by retry/resumable/active-WIP metadata.
- CO-556 duplicates CO-515 stale-source recompute/invalidation instead of consuming trustworthy source freshness.
- The fix reopens CO-458 or broadens into all CO-552 drift invariants.

## Goals
- Create the CO-556 docs-first packet and registry mirrors.
- Define the parent implementation contract for stale resident code response after CO-515 source freshness is trustworthy.
- Ensure `co-status --format json` exposes auto-restart/fail-closed policy state with source evidence.
- Preserve `provider-intake-state.json` as audit evidence while blocking unsafe active WIP on stale resident code.
- Preserve CO-555 terminal Linear truth and terminal-claim precedence.

## Non-Goals
- No implementation or test edits in this child lane.
- No Linear mutation, workpad mutation, GitHub/PR lifecycle, or full validation in this child lane.
- No manual delete, rewrite, or quarantine of `provider-intake-state.json`.
- No duplicate CO-515 stale-source recompute/invalidation.
- No CO-458 reopening.
- No broad CO-552 drift-invariant implementation.
- No weakening of CO-555 terminal-claim precedence.

## Acceptance Criteria
- CO-556 packet docs and task registration exist in the declared file scope.
- `tasks/index.json` registers `20260520-linear-2d28fad8-60e7-462d-9c70-dec1d421b55c` and links the canonical TECH_SPEC.
- `docs/TASKS.md` includes a CO-556 snapshot.
- `docs/docs-freshness-registry.json` includes the declared packet/checklist/mirror files.
- Parent implementation consumes current `source_root_freshness` rather than duplicating CO-515 recompute.
- Parent implementation auto-restarts only when stale resident code evidence is clear and restart can be bounded and verified.
- Parent implementation fails closed when stale resident code is detected and auto-restart is not safe, not available, or not proven.
- Parent implementation preserves terminal Linear truth, active-WIP precedence from CO-555, and `provider-intake-state.json` audit evidence.

## Validation Plan
- Child lane:
  - JSON parse for `tasks/index.json`
  - JSON parse for `docs/docs-freshness-registry.json`
  - protected-term scan over declared CO-556 packet and registration files
  - `git diff --check` over declared touched paths
- Parent lane:
  - focused control-host policy tests for stale resident code
  - focused `co-status --format json` or `/ui/data.json` projection assertions for restart/fail-closed state
  - active-WIP precedence tests proving CO-555 terminal Linear truth still wins
  - no-manual-delete proof for `provider-intake-state.json`
  - docs-review before implementation
  - implementation gate, standalone review, elegance pass, PR checks, ready-review drain, and Linear handoff

## Fallback / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? `Yes`.
- Decision: remove the fallback where stale resident code can continue to handle active WIP as though the supervised control-host source is fresh.
- Large-refactor check: keep CO-556 scoped to stale resident code policy. Do not reimplement CO-515 source recompute/invalidation and do not broaden into all CO-552 drift invariants unless parent source inspection proves one shared policy helper is required to avoid split authority.
- Minor-seam decision: acceptable because the policy consumes existing freshness evidence, preserves terminal Linear truth, and fails closed when restart cannot be proven.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Stale resident code policy | A resident supervised control-host with stale `source_root_freshness` can still present active WIP as actionable after `origin/main` advances. | remove fallback | CO-556 | `control-host-owner.json` or `co-status --format json` reports stale resident code behind `origin/main`. | Observed 2026-05-20 | 2026-05-20 | This issue | Stale resident code triggers bounded auto-restart when safe or fail closed before provider-worker actions continue as fresh. | Focused control-host policy tests, status projection assertions, and CO-555 terminal-precedence regression coverage. |

## Open Questions
- Should auto-restart be triggered by the control-host polling loop, the provider-worker admission path, or a shared stale-source policy helper?
- What structured JSON field should represent fail closed state so operators can distinguish stale resident code from quota, Linear, or review-gate blockers?
- What maximum restart-attempt budget should parent implementation use before staying failed closed?

## Approvals
- Product: CO-556 issue contract supplied by parent lane.
- Engineering: bounded docs-only child lane on 2026-05-20.
- Design: N/A.
