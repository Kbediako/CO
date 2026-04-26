# Task Checklist - linear-cb51b492-6f6e-4eca-a9a2-589833218f80

- Linear Issue: `CO-375` / `cb51b492-6f6e-4eca-a9a2-589833218f80`
- MCP Task ID: `linear-cb51b492-6f6e-4eca-a9a2-589833218f80`
- Primary PRD: `docs/PRD-linear-cb51b492-6f6e-4eca-a9a2-589833218f80.md`
- TECH_SPEC: `tasks/specs/linear-cb51b492-6f6e-4eca-a9a2-589833218f80.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-cb51b492-6f6e-4eca-a9a2-589833218f80.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-cb51b492-6f6e-4eca-a9a2-589833218f80.md`
- Parent manifest: `.runs/linear-cb51b492-6f6e-4eca-a9a2-589833218f80/cli/2026-04-25T17-47-23-480Z-e6f61136/manifest.json`
- Workpad comment: `5c4b1b0b-f794-4a2e-b45d-a4321ad31bf9`

## Docs-First
- [x] CO-375 moved from `Ready` to `In Progress` before active work. Evidence: Linear transition at `2026-04-25T17:49:23.304Z`.
- [x] Single required workpad created. Evidence: Linear comment `5c4b1b0b-f794-4a2e-b45d-a4321ad31bf9`.
- [x] Pre-turn decomposition matrix and parallelization decision recorded. Evidence: `linear parallelization` audit entry for `parallelize_now` / `independent_scope_available`.
- [x] Same-issue child lane `workflow-scan` completed successfully and produced the initial audit in its isolated workspace. Evidence: `.runs/linear-cb51b492-6f6e-4eca-a9a2-589833218f80-workflow-scan/cli/2026-04-25T17-49-36-168Z-9fad0145/manifest.json`.
- [x] PRD drafted for the GitHub Actions Node 24-compatible action major upgrade. Evidence: `docs/PRD-linear-cb51b492-6f6e-4eca-a9a2-589833218f80.md`.
- [x] TECH_SPEC drafted with protected terms, parity matrix, target action majors, and validation requirements. Evidence: `tasks/specs/linear-cb51b492-6f6e-4eca-a9a2-589833218f80.md`, `docs/TECH_SPEC-linear-cb51b492-6f6e-4eca-a9a2-589833218f80.md`.
- [x] ACTION_PLAN drafted for audit, implementation, validation, and handoff. Evidence: `docs/ACTION_PLAN-linear-cb51b492-6f6e-4eca-a9a2-589833218f80.md`.
- [x] Checklist mirrored to `.agent/task`. Evidence: `.agent/task/linear-cb51b492-6f6e-4eca-a9a2-589833218f80.md`.
- [x] Registry mirrors updated for the CO-375 packet. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Docs-review evidence captured before implementation handoff/review. Evidence: `.runs/linear-cb51b492-6f6e-4eca-a9a2-589833218f80-docs-review/cli/2026-04-25T17-59-08-846Z-5191378f/manifest.json` initially failed in `npm run docs:check` on pre-existing missing `linear-1c101ebc-4b86-4c1f-b04d-0455e50fbacb` docs paths; current `origin/main` now contains those paths and latest main Core Lane passed `docs:check`.

## Workflow Audit
- [x] Initial child-lane audit inspected all 9 workflow files and 20 `uses:` references. Evidence: child lane manifest `.runs/linear-cb51b492-6f6e-4eca-a9a2-589833218f80-workflow-scan/cli/2026-04-25T17-49-36-168Z-9fad0145/manifest.json`; the child-lane-local report was not retained as a tracked repo artifact.
- [x] Upstream action metadata checked for current and target action runtimes. Evidence: parent terminal verification of `action.yml` `runs.using`.
- [x] Post-change scan confirms no supported Node 20-backed action majors remain. Evidence: `out/linear-cb51b492-6f6e-4eca-a9a2-589833218f80/manual/workflow-uses-post.txt` and zero-byte `out/linear-cb51b492-6f6e-4eca-a9a2-589833218f80/manual/workflow-node20-remaining-post.txt`.

## Implementation
- [x] Upgrade workflow action majors to Node 24-compatible replacements. Evidence: `.github/workflows/core-lane.yml`, `.github/workflows/cloud-canary.yml`, `.github/workflows/pack-smoke-backstop.yml`, `.github/workflows/docs-truthfulness-weekly.yml`, `.github/workflows/archive-automation-base.yml`, `.github/workflows/automation-branch-cleanup.yml`, and `.github/workflows/release.yml`.
- [x] Preserve workflow permissions, triggers, schedules, env, command sequence, cache settings, artifact names/paths, release behavior, and archive PR behavior. Evidence: workflow diff only changes supported action major tags.
- [x] Keep explicit `node-version` values unchanged unless validation proves a required compatibility exception. Evidence: workflow diff preserves existing `node-version` values.

## Validation
- [x] `node scripts/delegation-guard.mjs`.
- [x] `node scripts/spec-guard.mjs --dry-run`.
- [x] `npm run build`.
- [x] `npm run lint`.
- [x] `npm run test`.
- [x] `npm run docs:check`. Evidence: `out/linear-cb51b492-6f6e-4eca-a9a2-589833218f80/validation/docs-check.log` reports `docs:check: OK` on the current-main PR #673 branch.
- [x] `npm run docs:freshness`. Evidence: `out/linear-cb51b492-6f6e-4eca-a9a2-589833218f80/validation/docs-freshness.log` reports `docs:freshness OK - 4763 docs, 4766 registry entries` on the current-main PR #673 branch.
- [x] `npm run repo:stewardship`.
- [x] `node scripts/diff-budget.mjs`.
- [x] `codex-orchestrator review` / `npm run review` under `FORCE_CODEX_REVIEW=1`. Evidence: `.runs/linear-cb51b492-6f6e-4eca-a9a2-589833218f80/cli/2026-04-25T17-47-23-480Z-e6f61136/review/telemetry.json` reports `status: succeeded`, `review_outcome: clean-success`.
- [x] Explicit elegance/minimality pass. Evidence: `out/linear-cb51b492-6f6e-4eca-a9a2-589833218f80/manual/elegance-review.md`.
- [ ] PR #673 attachment and `pr ready-review` drain before review handoff.

## Progress Log
- 2026-04-25: live Linear context showed CO-375 in `Ready`, no PR attachments, and no workpad. Parent moved it to `In Progress`, created branch `linear/co-375-node24-actions`, created the single workpad, recorded `parallelize_now`, and launched same-issue child lane `workflow-scan`.
- 2026-04-25: child lane succeeded with a zero-byte patch and advisory report in the child workspace. Parent owns implementation and final post-change scan.
- 2026-04-25: implementation upgraded supported Node 20-backed action majors to Node 24-compatible majors and preserved installed Node versions plus workflow behavior-sensitive inputs. Local build, lint, test, stewardship, diff budget, standalone review, and elegance pass completed. Initial review handoff was blocked by pre-existing docs hygiene tracked in `CO-377` / `CO-175`.
- 2026-04-26: parent replayed the CO-375 implementation onto current `origin/main` on branch `linear/co-375-node24-actions-current` after PRs #670, #671, and #672 merged. The prior `CO-377` missing-path blocker no longer reproduces on main; PR #673 is open from the current-main branch, and fresh parent reruns of `npm run docs:check` and `npm run docs:freshness` passed on that branch.

## Notes
- Do not change workflow installed Node versions as part of the action runtime upgrade.
- Do not broaden release/archive workflow behavior.
- Treat `peter-evans/enable-pull-request-automerge@v3` as composite unless new evidence proves a Node runtime issue.
