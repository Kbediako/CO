# Task Checklist - linear-62d5261d-b0ee-4988-9f02-43b3e1c85bde

- Linear Issue: `CO-434` / `62d5261d-b0ee-4988-9f02-43b3e1c85bde`
- MCP Task ID: `linear-62d5261d-b0ee-4988-9f02-43b3e1c85bde`
- Primary PRD: `docs/PRD-linear-62d5261d-b0ee-4988-9f02-43b3e1c85bde.md`
- TECH_SPEC: `tasks/specs/linear-62d5261d-b0ee-4988-9f02-43b3e1c85bde.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-62d5261d-b0ee-4988-9f02-43b3e1c85bde.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-62d5261d-b0ee-4988-9f02-43b3e1c85bde.md`
- Agent mirror: `.agent/task/linear-62d5261d-b0ee-4988-9f02-43b3e1c85bde.md`
- Canonical owner marker: `codex-orchestrator:canonical-owner-key=baseline_cohort_id_sha256:8fe99c9bccb9aba10ce27a2ac178403a2f26b80a4445c8279f52b01da699ae2d`

## Docs-First Packet
- [x] Issue-quality review captured. Evidence: `tasks/specs/linear-62d5261d-b0ee-4988-9f02-43b3e1c85bde.md` records protected terms, non-goals, `Not done if`, and parity-matrix status.
- [x] Fallback / refactor decision captured. Evidence: `tasks/specs/linear-62d5261d-b0ee-4988-9f02-43b3e1c85bde.md` justifies retaining exact Markdown bullet marker compatibility as a supported parser contract.
- [x] Durable fallback retention evidence captured. Evidence: `tasks/specs/linear-62d5261d-b0ee-4988-9f02-43b3e1c85bde.md`.
- [x] PRD drafted. Evidence: `docs/PRD-linear-62d5261d-b0ee-4988-9f02-43b3e1c85bde.md`.
- [x] Canonical TECH_SPEC drafted. Evidence: `tasks/specs/linear-62d5261d-b0ee-4988-9f02-43b3e1c85bde.md`.
- [x] Docs TECH_SPEC mirror drafted. Evidence: `docs/TECH_SPEC-linear-62d5261d-b0ee-4988-9f02-43b3e1c85bde.md`.
- [x] ACTION_PLAN drafted. Evidence: `docs/ACTION_PLAN-linear-62d5261d-b0ee-4988-9f02-43b3e1c85bde.md`.
- [x] Task checklist mirrored. Evidence: `tasks/tasks-linear-62d5261d-b0ee-4988-9f02-43b3e1c85bde.md`, `.agent/task/linear-62d5261d-b0ee-4988-9f02-43b3e1c85bde.md`.
- [x] Packet registered in task index and docs freshness registry. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.

## Required Implementation Outcomes
- [x] Owner issue is stamped with the exact canonical owner marker. Evidence: live CO-434 issue description includes `codex-orchestrator:canonical-owner-key=baseline_cohort_id_sha256:8fe99c9bccb9aba10ce27a2ac178403a2f26b80a4445c8279f52b01da699ae2d`.
- [x] Owner state is live and non-terminal before provider gates rely on it. Evidence: Linear issue-context after kickoff shows CO-434 in `In Progress`.
- [x] Follow-up runs with the same canonical key update/reuse this owner instead of creating duplicates. Evidence: focused `ProviderLinearWorkflowFacade` regression returns `action=reused` for the CO-434 oversized key and does not call issue creation.
- [x] Action evidence cites affected cohort id, sample paths, and configured historical owner evidence. Evidence: PRD/TECH_SPEC and workpad cite the oversized cohort id, tasks/tasks-2001-historical.md, and `CO-175`.

## Focused Validation
- [x] Required same-issue parallelization decision recorded. Evidence: `linear parallelization` returned `stay_serial` / `single_bounded_change` with docs/test/research/review slice labels.
- [x] Current maintenance output captured. Evidence: `out/linear-62d5261d-b0ee-4988-9f02-43b3e1c85bde/docs-freshness-maintenance.json` reports `freshness_decision=clean`, `candidate_cohorts=[]`, and `owner_action_evidence.status=not_applicable`.
- [x] Focused facade regression passed. Evidence: `npm run test -- ProviderLinearWorkflowFacade.test.ts` passed 264 tests.
- [x] Delegation guard passed. Evidence: `node scripts/delegation-guard.mjs` passed with two subagent manifests, including `.runs/linear-62d5261d-b0ee-4988-9f02-43b3e1c85bde-docs-review-r2/cli/2026-05-05T20-52-11-727Z-2de51807/manifest.json`.
- [x] Spec guard passed. Evidence: `node scripts/spec-guard.mjs --dry-run`.
- [x] Build passed. Evidence: `npm run build`.
- [x] Lint passed. Evidence: `npm run lint` completed with only pre-existing `DelegationMcpHealth.test.ts` warnings.
- [x] Test suite passed. Evidence: `npm run test` passed 359 files / 5382 tests.
- [x] Docs check passed. Evidence: `npm run docs:check`.
- [x] Docs freshness passed. Evidence: `npm run docs:freshness`.
- [x] Docs freshness maintenance passed after patch. Evidence: `npm run docs:freshness:maintain -- --format json` reported `freshness_decision=clean`, `candidate_cohorts=[]`, and `blocking_changed_paths=[]`.
- [x] Repo stewardship passed. Evidence: `npm run repo:stewardship` reported 6361 tracked files and 0 action-required.
- [x] Diff budget passed. Evidence: `node scripts/diff-budget.mjs` reported 9/25 files and 455/1200 lines after review/elegance evidence updates.
- [x] Pack smoke passed. Evidence: `npm run pack:smoke`.
- [x] Manifest-backed standalone review completed. Evidence: `../../.runs/linear-62d5261d-b0ee-4988-9f02-43b3e1c85bde/cli/2026-05-05T20-39-32-939Z-e273dbf9/review/telemetry.json` reports `status=succeeded` and `review_outcome=clean-success`.
- [x] Elegance/minimality review completed. Evidence: `out/linear-62d5261d-b0ee-4988-9f02-43b3e1c85bde/manual/elegance-review.md`.
- [ ] PR attached, checks green, actionable feedback handled, and ready-review drain clean. Evidence: pending.

## Notes
- Do not weaken `docs:freshness`, `docs:freshness:maintain`, or `spec-guard`.
- Do not blindly bump `last_review`.
- Do not delete historical packet evidence for tasks/tasks-2001-historical.md.
- Keep terminal-owner replacement and completed-lane registry residue behavior unchanged.
