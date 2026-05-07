# Task Checklist - linear-779bc931-f6b4-4a1c-b16f-145d500aca73

- Linear Issue: `CO-492` / `779bc931-f6b4-4a1c-b16f-145d500aca73`
- Task registry id: `20260507-linear-779bc931-f6b4-4a1c-b16f-145d500aca73`
- MCP Task ID: `linear-779bc931-f6b4-4a1c-b16f-145d500aca73`
- Primary PRD: `docs/PRD-linear-779bc931-f6b4-4a1c-b16f-145d500aca73.md`
- TECH_SPEC: `tasks/specs/linear-779bc931-f6b4-4a1c-b16f-145d500aca73.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-779bc931-f6b4-4a1c-b16f-145d500aca73.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-779bc931-f6b4-4a1c-b16f-145d500aca73.md`
- Source anchor: `ctx:sha256:3d2d783bff06744771ae73806255246cfa5f544055209f45373d48804ad1e0ba#chunk:c000001`
- Child lane manifest: `.runs/linear-779bc931-f6b4-4a1c-b16f-145d500aca73-docs-packet-rework/cli/2026-05-07T15-57-09-661Z-55e51e78/manifest.json`

## Docs-First
- [x] Same-issue docs child lane rebuilt the CO-492 docs-first packet and mirrors inside the declared file scope. Evidence: this patch.
- [x] PRD created with issue description, stale PR `#788` review findings, intent checksum, non-goals, and `Not Done If`. Evidence: `docs/PRD-linear-779bc931-f6b4-4a1c-b16f-145d500aca73.md`.
- [x] TECH_SPEC created with advisory `manifest goal_evidence` contract, workpad summary boundaries, and focused acceptance/test plan. Evidence: `tasks/specs/linear-779bc931-f6b4-4a1c-b16f-145d500aca73.md`, `docs/TECH_SPEC-linear-779bc931-f6b4-4a1c-b16f-145d500aca73.md`.
- [x] ACTION_PLAN created for parent implementation sequencing. Evidence: `docs/ACTION_PLAN-linear-779bc931-f6b4-4a1c-b16f-145d500aca73.md`.
- [x] Checklist mirrored to `.agent/task`. Evidence: `.agent/task/linear-779bc931-f6b4-4a1c-b16f-145d500aca73.md`.
- [x] Task registration and docs freshness registry mirrors updated. Evidence: `tasks/index.json`, `docs/docs-freshness-registry.json`, and `docs/TASKS.md`.

## Protected Issue Terms
- [x] persisted `/goal`
- [x] goals feature
- [x] app-server APIs
- [x] model tools
- [x] provider-worker run evidence
- [x] manifest goal_evidence
- [x] workpad summary
- [x] advisory_only
- [x] `authority=advisory_only`
- [x] Linear remains source of truth
- [x] stale PR `#788`

## Acceptance Criteria
- [ ] Provider-worker manifests persist `goal_evidence.authority=advisory_only` and preserve `linear_authority_preserved=true`.
- [ ] Workpad summary includes at most a compact advisory line and never presents goal state as completion, review, or merge authority.
- [ ] Disabled goals fail closed before candidate reuse.
- [ ] Manifest patching does not write stale fallback snapshots.
- [ ] Command-runner manifest persistence enforces advisory markers.
- [ ] Legacy hydration no-backfill is tested with a real goal notification.
- [ ] `elapsed_seconds` accepts fractional seconds.
- [ ] Thread-mismatch regression pins goals on.
- [ ] Stale candidate timestamps classify as stale.
- [ ] Goal state cannot authorize Linear transitions, PR attachment, review handoff, ready-review success, merge closeout, hook recovery success, long-poll terminal status, hook/resume control integration, or TUI automation.

## Non-Goals / Not Done If
- [x] Not done if goal state authorizes Linear transitions.
- [x] Not done if goal state authorizes PR attachment.
- [x] Not done if goal state authorizes review handoff.
- [x] Not done if goal state authorizes ready-review success.
- [x] Not done if goal state authorizes merge closeout.
- [x] Not done if goal state authorizes hook recovery success.
- [x] Not done if goal state authorizes long-poll terminal status.
- [x] Not done if this lane implements hook/resume control integration.
- [x] Not done if this lane implements TUI automation.
- [x] Not done if stale PR `#788` is treated as the active replacement PR.

## Fallback Decision Table
- Large-refactor decision: not required; CO-492 adds bounded advisory evidence capture without changing lifecycle authority.
- Minor-seam decision: acceptable only with fail-closed candidate validation, no stale fallback snapshots, and explicit advisory markers.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Provider-worker lifecycle authority | Goal evidence may exist beside Linear/workpad/PR/review/check truth. | justify retaining fallback | CO provider-worker workflow | goals feature enabled, unavailable, stale, or thread mismatched | Existing authority predates CO-492 | 2026-05-07 | non-expiring authority contract | only replaced by a separate approved authority redesign | Advisory marker tests plus provider-worker lifecycle gates. |
| Stale fallback snapshots | Manifest patching could reuse stale candidate data to populate `goal_evidence`. | remove fallback | CO-492 | candidate reuse or manifest patching | stale PR #788 attempt | 2026-05-07 | this issue | stale snapshots are never written; stale candidates classify as stale | Manifest patching and stale timestamp regressions. |
| Legacy hydration backfill | Legacy manifests could infer goal evidence without real goal notification. | remove fallback | CO-492 | legacy hydration reads old manifests | stale PR #788 attempt | 2026-05-07 | this issue | no backfill without real notification/current snapshot | Legacy hydration real notification regression. |

- Contract name: Linear-first lifecycle authority with optional advisory `manifest goal_evidence`.
- Owning surface: provider-worker manifest persistence and workpad summary rendering.
- Steady-state proof: focused tests prove invalid candidate rejection and advisory marker persistence.
- Tests/docs: CO-492 focused provider-worker manifest/workpad tests and this packet.
- Non-expiring rationale: Linear/workpad/PR/review/check authority is the durable governing contract; advisory goal evidence is not temporary lifecycle authority and can only be replaced by a separate approved authority redesign.

## Parent-Owned Implementation
- [ ] Add normalized advisory `goal_evidence` capture to provider-worker manifest evidence assembly.
- [ ] Gate candidate reuse on goals feature availability, source provenance, thread identity, and timestamp freshness.
- [ ] Ensure command-runner manifest persistence preserves advisory markers.
- [ ] Ensure manifest patching refuses stale fallback snapshots.
- [ ] Ensure legacy hydration performs no backfill without a real goal notification/current snapshot.
- [ ] Support fractional `elapsed_seconds`.
- [ ] Render workpad summary from persisted advisory manifest evidence only.
- [ ] Add focused tests for every stale PR `#788` review finding.

## Validation
- [x] Child-lane JSON parse for registry mirrors. Evidence: `jq empty tasks/index.json docs/docs-freshness-registry.json`.
- [x] Child-lane protected-term scan over changed packet files. Evidence: scoped `rg`.
- [x] Child-lane whitespace check. Evidence: `git diff --check`.
- [ ] Parent focused provider-worker manifest/workpad tests.
- [ ] Parent `node scripts/spec-guard.mjs --dry-run`.
- [ ] Parent build/lint/test/docs gates selected for implementation scope.
- [ ] Parent manifest-backed review and elegance/minimality pass.
- [ ] Parent replacement PR review drain.

## Progress Log
- 2026-05-07: Docs-only rework child lane created CO-492 packet files and registry mirrors from current `origin/main`.
- 2026-05-07: Source payload path from parent prompt was absent in this child checkout; packet preserved the source anchor and used the current issue description plus local CO-486 context.
- 2026-05-07: Stale PR `#788` findings were translated into acceptance criteria and parent-owned focused validation requirements.

## Notes
- Parent owns Linear state, workpad, GitHub, PR lifecycle, implementation, and full validation.
- Child lane must leave changes uncommitted for patch export.
