---
id: 20260408-linear-1c361221-d50a-43bd-aeba-ce6bada3b07f
title: CO Add a Bounded macOS Screenshot-Proof Capture Path Without External Helper Dependencies
status: done
owner: Codex
created: 2026-04-08
last_review: 2026-05-12
review_cadence_days: 30
risk_level: high
related_prd: docs/PRD-linear-1c361221-d50a-43bd-aeba-ce6bada3b07f.md
related_action_plan: docs/ACTION_PLAN-linear-1c361221-d50a-43bd-aeba-ce6bada3b07f.md
related_tasks:
  - tasks/tasks-linear-1c361221-d50a-43bd-aeba-ce6bada3b07f.md
review_notes:
  - 2026-04-08: Opened from Linear issue `CO-105` in the provider-worker workspace, confirmed the live team state names with `linear issue-context`, and moved the issue from `Ready` to `In Progress` before active coding.
  - 2026-04-08: Bootstrap review confirmed the current seam split on `main`: `providerLinearRuntimeProof.ts` resolves permit and reviewer-link posture, `providerLinearWorkflowFacade.ts` embeds already-existing local images, and no repo-owned macOS screenshot capture helper exists yet.
  - 2026-04-08: `CO-97` closeout evidence was re-read directly from the prior Linear workpad and preserved here: the local screenshot helper path failed on this host because of a Swift/SDK mismatch, so proof capture used direct macOS `screencapture` plus AppleScript cleanup instead of the helper wrapper.
  - 2026-04-08: Pre-implementation issue-quality review approves one bounded lane only: add a repo-owned built-in macOS screenshot helper, keep upload/embed and reviewer-URL handoff as separate seams, and do not broaden into generic media tooling or cross-platform capture.
  - 2026-04-08: The first audited `docs-review` child stream failed at `docs:check` on two packet-local issues (a speculative missing path reference and a `docs/TASKS.md` line-budget overflow). After removing the missing path reference and running `npm run docs:archive-tasks` to bring `docs/TASKS.md` from 451 to 447 lines, the rerun passed `spec-guard` and `docs:check`, then failed only on the existing repo-wide `docs:freshness` stale-doc baseline (`stale docs: 121`; Task Packet stale=90, Task Mirror stale=18, Report Only stale=13). The CO-105 packet is not listed among the stale entries, so manual fallback is accepted for docs-first approval.
  - 2026-05-12: CO-523 live Linear audit verified CO-105 is Done/completed; reclassified this task spec as inactive done metadata for strict spec-guard evidence. Evidence: .runs/linear-8573da42-d9f9-44ce-a24e-224984539044/cli/2026-05-12T18-47-35-293Z-376d8842/provider-linear-issue-context-cache-1c361221-d50a-43bd-aeba-ce6bada3b07f.json.
---

# Technical Specification

## Context
CO already has two adjacent proof seams, but not the local capture seam in between them. `runtime-proof` handles permit-backed reviewer-link handoff for app-touching lanes, and `upsert-workpad` already uploads local image refs once a screenshot file exists. `CO-105` exists because that middle step is still off-contract: on this host, the prior local helper failed with a Swift/SDK mismatch, so the actual proof workflow fell back to raw `screencapture` plus AppleScript cleanup.

## Requirements
1. Add one repo-owned worker-visible macOS screenshot capture helper on the `linear` CLI surface.
2. The default path must use built-in macOS tools only and must not require the external/local Swift wrapper or another new dependency.
3. The helper must return or record a local screenshot artifact that is directly compatible with existing `linear upsert-workpad` local-image embedding.
4. The helper must classify, at minimum:
   - capture success
   - Screen Recording denial or explicit capture-permission failure
   - unreadable or missing output file
   - cleanup success
   - cleanup skip when no temporary proof surface was opened
   - Automation denial or cleanup failure when cleanup was attempted
5. The helper must keep capture failure distinct from later `upsert-workpad` upload/embed failure and from `runtime-proof` reviewer-link failure.
6. Worker/operator guidance must explain when to use:
   - `linear screenshot-proof`
   - `linear runtime-proof`
   - direct `upsert-workpad` local-image embedding once a screenshot file already exists
7. Focused tests must cover command shaping and failure classification in the capture orchestration layer.
8. Host-manual validation must:
   - capture at least one real screenshot using the new helper on this machine
   - embed it directly into the live CO-105 workpad
   - record cleanup status truthfully
   - exercise the explicit failure-reporting paths for denied Screen Recording, denied Automation, unreadable output, and cleanup failure or skip

## Design
- Add a new control module under `orchestrator/src/cli/control/` that owns the macOS capture contract.
- Add a new worker-visible CLI subcommand, `linear screenshot-proof`, in `orchestrator/src/cli/linearCliShell.ts` and `bin/codex-orchestrator.ts`.
- Keep the default capture implementation bounded to:
  - `screencapture` for image creation
  - local file verification (`stat` and read checks)
  - optional built-in cleanup via `osascript` only when the helper itself opened a temporary proof surface or preview path
- Return structured JSON that records:
  - resolved output path and local file URL
  - capture mode / command shaping
  - bytes and content type when capture succeeds
  - capture classification or cleanup classification when it fails
  - whether cleanup was skipped, succeeded, or failed
- Extend `providerLinearWorkflowAudit.ts` so screenshot-capture attempts are auditable separately from `runtime-proof` and `upsert-workpad`.
- Update worker guidance in `providerLinearWorkerRunner.ts` and `skills/linear/SKILL.md` so capture is discoverable in the same workflow surface that already teaches `runtime-proof` and `upsert-workpad`.

## Validation
- Run audited `linear child-stream --pipeline docs-review` before implementation.
- Add focused capture-module tests for:
  - successful capture result shaping
  - unreadable output classification
  - Screen Recording denial classification
  - Automation denial classification
  - cleanup failure classification
  - cleanup skip classification
- Add focused CLI tests for the new subcommand and audit plumbing.
- Run the required repo validation floor after implementation.
- Capture one real screenshot on this host via the new helper and embed it directly in the active CO-105 workpad.

## Approvals
- Reviewer: `codex-orchestrator docs-review` rerun recorded a truthful manual fallback after packet-local fixes; `spec-guard` and `docs:check` passed, and only the existing repo-wide `docs:freshness` stale-doc baseline remained. Evidence: `.runs/linear-1c361221-d50a-43bd-aeba-ce6bada3b07f-co-105-docs-review-rerun/cli/2026-04-07T14-53-48-499Z-d042023d/manifest.json`, `out/linear-1c361221-d50a-43bd-aeba-ce6bada3b07f-co-105-docs-review-rerun/docs-freshness.json`.
- Date: 2026-04-08
