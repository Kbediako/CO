---
id: 20260328-linear-b8a32c11-cfc6-4556-b783-f59b290fe67d
title: CO Run Codex 0.117.x-to-main Canary for Multi-Agent-v2 and App-Server Adoption
owners: [Codex]
last_review: 2026-03-28
---
## Requirements
1. Re-audit the required upstream baseline (`agent_path`, `multi_agents_v2`, app-server README/protocol) against current active CO docs/runtime surfaces.
2. Correct active stale guidance/defaults that are already contradicted by the canary baseline, especially `0.115.0` policy posture and `max_spawn_depth` guidance/defaults.
3. Keep collab lineage schema changes additive only; preserve stable thread-id fields while capturing richer metadata when current payloads expose it.
4. Make the current provider-worker supervision seam explicit: keep `codex exec` / `codex exec resume` as the live path unless the canary yields stronger evidence for an app-server-backed control seam.
5. Capture canary evidence for multi-agent-v2 behavior and the app-server surfaces most relevant to supervision (`thread/list`, `thread/metadata/update`, websocket bearer auth, long-lived session behavior, and conservative treatment of `thread/shellCommand` / `fs/watch`).
6. State the resulting sequencing for `CO-13` and `CO-14` explicitly, including any deferrals and guardrails.

## Outcome
- Adoption decision: keep active CO compatibility posture at `codex-cli 0.117.0` for current upstream-aligned main by pairing this lane's clean local canary evidence with the previously recorded cloud contract/fallback baseline.
- Runtime decision: keep app-server as the normal local runtime path, but do not switch provider-worker supervision to an app-server-backed control seam in this issue; stay on `codex exec` / `codex exec resume`.
- Collab-lineage decision: keep `sender_thread_id` / `receiver_thread_ids` as the stable manifest contract and capture agent-path metadata additively only when current payloads actually expose it.
- Guidance decision: stop treating `max_spawn_depth` as part of the active CO baseline; preserve it only as a legacy local override advisory when older parser/runtime combinations still consume spawn-depth caps.
- Sensitive-surface decision: treat `thread/shellCommand` and related richer app-server control surfaces as explicitly out of the default provider-worker authority model for now.

## Evidence
- Docs-review gate: `.runs/linear-b8a32c11-cfc6-4556-b783-f59b290fe67d-docs-review/cli/2026-03-27T14-15-07-635Z-fe73e2e2/manifest.json`
- Live bounded collab canary: `out/linear-b8a32c11-cfc6-4556-b783-f59b290fe67d/manual/live-multi-agent-canary.jsonl`
- App-server CLI/auth surface capture: `out/linear-b8a32c11-cfc6-4556-b783-f59b290fe67d/manual/app-server-help.txt`
- Runtime-mode canary summary: `out/linear-b8a32c11-cfc6-4556-b783-f59b290fe67d/manual/runtime-mode-canary/runtime-canary-summary.json`
- Existing cloud required-contract baseline reference: `tasks/specs/0958-cloud-canary-ci.md`
- Existing cloud fallback-contract baseline reference: `tasks/specs/0974-cloud-adoption-preflight-reliability.md`
- Closeout summary and validation matrix: `out/linear-b8a32c11-cfc6-4556-b783-f59b290fe67d/manual/adoption-decision-closeout.md`

## Validation And Review
- Required repo floor completed cleanly with delegation-guard override recorded for this run, followed by `build`, `lint`, `test`, `docs:check`, `docs:freshness`, `diff-budget`, and `pack:smoke`. The full `npm run test` output completed with all visible cases passing; the runner again failed to tear down cleanly afterward, but no lingering `vitest` or test `node` process remained in `ps`.
- Standalone review surfaced two high-signal issues during this lane and both were fixed before closeout:
  - `doctor` needed to keep warning on legacy low `max_spawn_depth` values rather than silently dropping that signal.
  - active repo-facing guidance still mentioned `max_spawn_depth` as part of the seeded baseline in `README.md`, `templates/codex/AGENTS.md`, and the delegation skill surfaces.
- The PR feedback sweep added four more actionable fixes before handoff:
  - manifest schema/type alignment for the additive collab lineage fields
  - additive thread/path alias closure in `doctorUsage`
  - whitespace normalization for optional agent metadata in `commandRunner`
  - explicit cloud-evidence gating language in `docs/guides/codex-version-policy.md`
- Final standalone-review reruns re-entered bounded reinspection without yielding a terminal verdict after the fixes, so the closeout uses the repo-approved manual fallback review plus explicit elegance notes captured in the closeout summary artifact.

## Sequencing
- `CO-13`: proceed on the current bounded provider-worker seam first. The canary helps `CO-13` by allowing additive agent-path metadata capture when present, but it does not justify widening provider-worker authority or changing the supervision seam yet.
- `CO-14`: keep as the broader evidence-gated follow-on direction. Re-read it in light of the stronger upstream substrate, but plan any richer app-server control substrate only in a separate lane with explicit authority, auth, and remote-session guardrails.
