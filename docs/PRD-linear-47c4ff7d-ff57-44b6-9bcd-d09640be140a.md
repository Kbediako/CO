# PRD - Maintain docs freshness rolling baseline for Apr 22 stale cohorts and registry drift

## Traceability
- Linear issue: `CO-300` / `47c4ff7d-ff57-44b6-9bcd-d09640be140a`
- Linear URL: https://linear.app/asabeko/issue/CO-300
- Task id: `linear-47c4ff7d-ff57-44b6-9bcd-d09640be140a`
- Canonical spec: `tasks/specs/linear-47c4ff7d-ff57-44b6-9bcd-d09640be140a.md`
- Worker run manifest: `.runs/linear-47c4ff7d-ff57-44b6-9bcd-d09640be140a/cli/2026-04-22T02-48-35-760Z-e043d741/manifest.json`
- Source anchor: `ctx:sha256:e6e7135ed5c5dcc34ca04950403e7a9a88a5902d59c65a6241a8aba0924f7392#chunk:c000001`
- Source payload path: `.runs/linear-47c4ff7d-ff57-44b6-9bcd-d09640be140a/cli/2026-04-22T02-48-35-760Z-e043d741/memory/source-0/source.txt`
- Source payload note: the shared `source-0` payload is the parent worker prompt for this run. An earlier same-issue docs child-lane seed packet was invalidated after the parent moved from detached `HEAD` to current `origin/main`, so the packet below is refreshed against the parent-owned `2026-04-22` baseline artifacts.

## Summary
- Problem Statement: current mainline docs freshness ownership is terminally stale on 2026-04-22. The original CO-300 issue packet preserved an earlier shared-checkout snapshot (`4307` docs, `4316` registry entries, `53` stale docs, `6` missing-on-disk rows), but fresh reproduction on current `origin/main` at `f6d89efc3` is narrower and still blocking: `docs:freshness FAILED - 4390 docs, 4393 registry entries`, `16` stale docs total, `0` missing-on-disk or invalid registry rows, one hard-stale path `docs/codex-orchestrator-issues.md`, and `15` historical candidate entries across `6` candidate cohorts. The debt is still repo-wide, not diff-local: `docs:freshness:maintain` reproduced `blocking_changed_paths=[]` for blocked `CO-295`, and the pre-fix owner path still reused terminal `CO-175` via `owner_issue_action=update_existing`.
- Desired Outcome: register the Apr 22 docs-first packet and required mirrors for `CO-300`, preserve the older `4307`/`4316`/`53`/`6 missing` snapshot as historical issue context only, clear the live hard-stale and Mar 22 cohort debt on current main, and make terminal owner reuse impossible without widening `CO-295`, weakening `docs:freshness`, or keeping terminal owner metadata live.

## User Request Translation (Context Anchor)
- User intent / needs: create only the CO-300 docs-first packet and required registry mirrors, preserve the exact Apr 22 blocker shape and protected terms, and leave all implementation, findings, tests, workpad, Linear state, and PR lifecycle work to the parent lane.
- Success criteria / acceptance:
  - the six packet files exist for `linear-47c4ff7d-ff57-44b6-9bcd-d09640be140a`
  - `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` reflect the new CO-300 packet and live canonical owner registration
  - the packet records the actual `2026-04-22` current-main blocker shape: `4390` docs, `4393` registry entries, `16` stale docs total, `0` missing-on-disk or invalid registry rows, hard-stale `docs/codex-orchestrator-issues.md`, `15` historical candidate entries across `6` candidate cohorts, Mar 22 stale packets and mirrors including `1317`/`1318`, `owner_issue=CO-175`, `owner_issue_action=update_existing` on the pre-fix path, and `blocking_changed_paths=[]` for blocked `CO-295`
  - the packet preserves the earlier `4307`/`4316`/`53`/`6 missing` issue snapshot as historical source context only and does not claim that it still reproduces on current main
  - the packet preserves `CO-267` as the previous canonical owner and `CO-175` as the original rolling owner while registering `CO-300` as the new live canonical owner for `docs:freshness:maintain`
  - the packet rejects widening `CO-295`, blind `last_review` bumps, duplicate live canonical-owner lanes, and deletion-only cleanup
- Constraints / non-goals:
  - this packet owns only `docs/PRD-*`, `docs/TECH_SPEC-*`, `docs/ACTION_PLAN-*`, `tasks/specs/*`, `tasks/tasks-*`, `.agent/task/*`, `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` for this task id
  - parent lane owns implementation, findings, tests, workpad, Linear state, validation, PR lifecycle, and merge
  - packet registration must not mutate Linear state or silently absorb implementation/test/findings/workpad scope

## Intent Checksum
- Exact user wording / phrases to preserve:
  - `docs:freshness`
  - `docs:freshness:maintain`
  - `canonical owner`
  - `CO-175`
  - `CO-267`
  - `terminal owner metadata`
  - `blocking_changed_paths=[]`
  - `docs/codex-orchestrator-issues.md`
  - `missing-on-disk registry references`
  - `Mar 21/22 historical cohorts`
  - `current main`
- Protected terms / exact artifact and surface names:
  - `CO-295`
  - `owner_issue=CO-175`
  - `owner_issue_action=update_existing`
  - `codex-orchestrator:canonical-owner-key=docs:freshness:maintain`
  - `docs/docs-freshness-registry.json`
  - `docs/guides/docs-freshness-cohorts.md`
  - `docs/docs-catalog.json`
  - `tasks/index.json`
  - `docs/TASKS.md`
  - `1317`
  - `1318`
- Nearby wrong interpretations to reject:
  - widen `CO-295` beyond its PR-attachment ownership fix
  - suppress `docs:freshness`, loosen `spec-guard`, or hide debt with blind `last_review` bumps
  - keep using a `Done` owner issue as the live maintenance owner
  - create duplicate canonical `docs:freshness:maintain` issues if a non-terminal owner with the same marker already exists
  - delete docs or registry rows solely to reduce counts without reviewed refresh, archive, or reclassification rationale

## Parity / Alignment Matrix

| Surface | Current Truth | Reference Truth | Target Truth | Explicitly Out Of Scope |
| --- | --- | --- | --- | --- |
| `docs:freshness` baseline | `current main` fails with `16` stale docs total, `0` missing-on-disk or invalid registry rows, hard-stale `docs/codex-orchestrator-issues.md`, and `15` historical candidate entries across `6` candidate cohorts. | CO-239 restored the Apr 18 Mar 18 `1289-1298` cohort without weakening gates or hiding debt. | Parent restores a truthful green Apr 22 baseline with reviewed evidence for the live hard-stale and Mar 22 cohort debt, while keeping the earlier `4307`/`4316`/`53`/`6 missing` snapshot as historical issue context only. | Gate weakening, warning-only downgrade, or deletion-only cleanup. |
| Canonical owner metadata | The pre-fix current-main maintenance path still points to terminal `CO-175`, while previous canonical owner `CO-267` is also `Done`; focused owner verification must flip the action from `update_existing` to live-owner creation. | The canonical owner marker should point to one live non-terminal owner issue. | `CO-300` becomes the live canonical `docs:freshness:maintain` owner for the Apr 22 baseline. | Leaving terminal owner metadata live or creating duplicate live canonical-owner lanes. |
| Historical cohort ownership | Mar 22 stale packets and mirrors remain in the current baseline, including `1317`/`1318` lineage work and adjacent packet docs. | Prior freshness owner lanes recorded date-boundary ownership with explicit classification and reviewed disposition. | Parent classifies and processes the live Mar 22 cohorts with explicit owner evidence under CO-300. | Folding the Apr 22 backlog into unrelated feature-lane scope. |
| Unrelated feature-lane unblock | `CO-295` is blocked even though `blocking_changed_paths=[]` proves the debt is not diff-local. | Repo-wide freshness debt and per-PR diff health stay separate. | `CO-295` can leave `Blocked` after the repo-wide owner lane is complete, without widening its implementation scope. | Provider-linear workflow or PR-attachment code changes inside CO-295. |

## Not Done If
- `docs:freshness:maintain` still resolves to a terminal owner issue after the Apr 22 owner lane is complete.
- `current main` still fails on the live hard-stale doc debt, Mar 22 cohort backlog, or terminal-owner reuse, or if the earlier missing-on-disk snapshot reappears without owned handling.
- Unrelated clean diffs like `CO-295` still block on repo-wide freshness debt while `blocking_changed_paths=[]`.
- The packet or closeout hides `CO-175` / `CO-267` lineage instead of preserving the owner transition truth.

## Goals
- Register the CO-300 docs-first packet and required mirrors.
- Preserve the exact Apr 22 blocker shape and protected terms.
- Record the canonical owner transition from terminal `CO-175` / `CO-267` to live `CO-300`.
- Keep implementation, findings, and validation parent-owned and explicit.

## Non-Goals
- No `CO-295` provider-linear workflow or PR-attachment code changes.
- No weakening of `docs:freshness`, `docs:freshness:maintain`, `docs:check`, or `spec-guard`.
- No deleting docs or registry rows solely to reduce counts.
- No widening of packet registration into implementation, test, findings, or workpad scope.

## Stakeholders
- Product: CO maintainers and feature-lane owners blocked by repo-wide docs freshness debt.
- Engineering: docs freshness, docs freshness maintain, registry/catalog, and provider-worker handoff maintainers.
- Design: N/A.

## Metrics & Guardrails
- Primary Success Metrics:
  - packet and mirrors exist under the exact CO-300 task id
  - registry mirrors preserve the refreshed current-main Apr 22 blocker shape and canonical owner transition
  - `tasks/index.json` and `docs/docs-freshness-registry.json` remain valid JSON
  - the docs packet stays bounded to the declared docs/task surfaces
- Guardrails / Error Budgets:
  - zero implementation/test/findings/workpad edits
  - zero Linear mutations
  - zero gate weakening language
  - explicit preservation of terminal-owner lineage and live canonical-owner intent

## Technical Considerations
- Architectural Notes:
  - this packet only registers the docs and mirrors; the parent should reuse the existing docs freshness, catalog, cohort-guide, and maintenance decision surfaces
  - CO-300 is a docs-first owner-registration lane, not a product or provider runtime redesign
  - the canonical owner handoff is part of repo metadata truth and must stay machine-checkable
- Dependencies / Integrations:
  - `scripts/docs-freshness.mjs`
  - `scripts/docs-freshness-maintain.mjs`
  - `scripts/spec-guard.mjs`
  - `docs/docs-freshness-registry.json`
  - `docs/guides/docs-freshness-cohorts.md`
  - `docs/docs-catalog.json`
  - `tasks/index.json`
  - `docs/TASKS.md`

## Open Questions
- Should any Mar 22 rows be archived or reclassified instead of reviewed refresh now that the earlier missing-on-disk snapshot no longer reproduces on current main?
- Is the smallest durable fix for terminal-owner drift centered in `docs:freshness:maintain`, catalog metadata, or both?

## Approvals
- Product: pending parent acceptance of the docs-first packet.
- Engineering: pending parent docs-review, implementation, and validation.
- Design: N/A.
