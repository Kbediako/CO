# Task Checklist - 1316-coordinator-symphony-poll-owned-discovery-and-recovery

- MCP Task ID: `1316-coordinator-symphony-poll-owned-discovery-and-recovery`
- Primary PRD: `docs/PRD-coordinator-symphony-poll-owned-discovery-and-recovery.md`
- TECH_SPEC: `tasks/specs/1316-coordinator-symphony-poll-owned-discovery-and-recovery.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-poll-owned-discovery-and-recovery.md`

## Docs-first
- [x] PRD drafted for the remaining post-`1315` parity slice covering poll-owned discovery/recovery plus observability API normalization. Evidence: `docs/PRD-coordinator-symphony-poll-owned-discovery-and-recovery.md`.
- [x] TECH_SPEC drafted for the remaining post-`1315` parity slice. Evidence: `tasks/specs/1316-coordinator-symphony-poll-owned-discovery-and-recovery.md`, `docs/TECH_SPEC-coordinator-symphony-poll-owned-discovery-and-recovery.md`.
- [x] ACTION_PLAN drafted for the remaining post-`1315` parity slice. Evidence: `docs/ACTION_PLAN-coordinator-symphony-poll-owned-discovery-and-recovery.md`.
- [x] `tasks/index.json` registers the `1316` TECH_SPEC entry. Evidence: `tasks/index.json`.
- [x] `docs/TASKS.md` updated with the `1316` snapshot. Evidence: `docs/TASKS.md`.
- [x] Checklist mirrored to `.agent/task/1316-coordinator-symphony-poll-owned-discovery-and-recovery.md`. Evidence: `.agent/task/1316-coordinator-symphony-poll-owned-discovery-and-recovery.md`.
- [x] docs-review recorded for `1316`. Evidence: `.runs/1316-coordinator-symphony-poll-owned-discovery-and-recovery/cli/2026-03-21T15-25-27-365Z-543bcc14/manifest.json`.
- [x] Publication posture stays truthful: `1315` is now implemented on the current branch, and `1316` now carries landed poll/recovery, `/api/v1` normalization, the final pagination/ordering/capacity implementation, and the Linear default-contract alignment; those implementation facts are separate from publication readiness, which remains open in PR `#283` (`CHANGES_REQUESTED`, `BEHIND`, failing `Core Lane` on `2026-03-21`). Evidence: `docs/TASKS.md`, `out/1316-coordinator-symphony-poll-owned-discovery-and-recovery/manual/20260321T164742Z-stacked-closeout/`, `gh pr view 283 --repo Kbediako/CO`.

## Implementation
- [x] Poll-owned discovery/recovery seam introduced for candidate discovery and reconciliation. Evidence: `orchestrator/src/cli/control/providerIssueHandoff.ts`, `orchestrator/src/cli/control/controlServerPublicLifecycle.ts`.
- [x] Fresh eligible active issues can be discovered without a new accepted provider event. Evidence: `orchestrator/tests/ProviderIssueHandoff.test.ts`, `orchestrator/tests/ControlHostCliShell.test.ts`.
- [x] Claims are released or recovered promptly when tracker state becomes terminal, non-active, or missing. Evidence: `orchestrator/tests/ProviderIssueHandoff.test.ts`.
- [x] Retry redispatch re-fetches active candidates instead of relying on stale claim-only state. Evidence: `orchestrator/src/cli/control/providerIssueHandoff.ts`, `orchestrator/tests/ProviderIssueHandoff.test.ts`.
- [x] `POST /api/v1/refresh` acknowledgement matches Symphony’s queued/coalesced/operations contract while retaining acceptable CO additive fields. Evidence: `orchestrator/src/cli/control/authenticatedRouteComposition.ts`, `orchestrator/tests/ControlServer.test.ts`, `orchestrator/tests/ObservabilityApiController.test.ts`.
- [x] `/api/v1/state.running[].state`, `/api/v1/<issue>.status`, and retry-only `workspace.path` semantics align with the Symphony baseline while keeping acceptable CO extensions additive. Evidence: `orchestrator/src/cli/control/compatibilityIssuePresenter.ts`, `orchestrator/src/cli/control/selectedRunProjection.ts`, `orchestrator/tests/ControlRuntime.test.ts`, `orchestrator/tests/SelectedRunProjection.test.ts`.
- [x] Fresh poll candidate dispatch evaluates the full active Linear candidate set, then honors Symphony priority ordering and slot-capped dispatch. Evidence: `orchestrator/src/cli/control/linearDispatchSource.ts`, `orchestrator/src/cli/control/providerIssueHandoff.ts`, `orchestrator/src/cli/controlHostCliShell.ts`, `orchestrator/tests/LinearDispatchSource.test.ts`, `orchestrator/tests/ProviderIssueHandoff.test.ts`, `orchestrator/tests/ControlHostCliShell.test.ts`.

## Validation
- [x] Focused regressions proving full candidate pagination, Symphony-order fresh dispatch, slot-capped fresh launches, and non-regression in the landed `1316` behavior. Evidence: `out/1316-coordinator-symphony-poll-owned-discovery-and-recovery/manual/20260321T164742Z-stacked-closeout/05-targeted-tests.log` (`109/109`).
- [x] `node scripts/delegation-guard.mjs`. Evidence: `out/1316-coordinator-symphony-poll-owned-discovery-and-recovery/manual/20260321T164742Z-stacked-closeout/01-delegation-guard.log`.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1316-coordinator-symphony-poll-owned-discovery-and-recovery/manual/20260321T164742Z-stacked-closeout/02-spec-guard.log`.
- [x] `npm run build`. Evidence: `out/1316-coordinator-symphony-poll-owned-discovery-and-recovery/manual/20260321T164742Z-stacked-closeout/03-build.log`.
- [x] `npm run lint`. Evidence: `out/1316-coordinator-symphony-poll-owned-discovery-and-recovery/manual/20260321T164742Z-stacked-closeout/04-lint.log`.
- [x] `npm run test`. Evidence: `out/1316-coordinator-symphony-poll-owned-discovery-and-recovery/manual/20260321T164742Z-stacked-closeout/06-full-test.log` (`284/284` files, `2097/2097` tests).
- [x] `npm run docs:check`. Evidence: `out/1316-coordinator-symphony-poll-owned-discovery-and-recovery/manual/20260321T164742Z-stacked-closeout/07-docs-check.log`.
- [x] `npm run docs:freshness`. Evidence: `out/1316-coordinator-symphony-poll-owned-discovery-and-recovery/manual/20260321T164742Z-stacked-closeout/08-docs-freshness.log`.
- [x] `node scripts/diff-budget.mjs` with override reason. Evidence: `out/1316-coordinator-symphony-poll-owned-discovery-and-recovery/manual/20260321T164742Z-stacked-closeout/09-diff-budget.log`.
- [x] Earlier review surfaced `3` P2 findings and the corresponding fixes were applied. Evidence: `out/1316-coordinator-symphony-poll-owned-discovery-and-recovery/manual/20260321T164742Z-stacked-closeout/10-review-pre-fix.log`.
- [x] Review rerun reached terminal status and surfaced two findings around queued null-attempt retry dispatch/recovery and compatibility retry timing; both are addressed on the current head, but a fresh clean rerun is still required. Evidence: `out/1316-coordinator-symphony-poll-owned-discovery-and-recovery/manual/20260321T164742Z-stacked-closeout/11-review-rerun.log`.
- [ ] Review is clean. Evidence: `out/1316-coordinator-symphony-poll-owned-discovery-and-recovery/manual/20260321T164742Z-stacked-closeout/11-review-rerun.log`.
- [ ] `npm run pack:smoke` if required by touched downstream-facing surfaces. Evidence: `out/1316-coordinator-symphony-poll-owned-discovery-and-recovery/manual/20260321T164742Z-stacked-closeout/12-pack-smoke.log`.
- [ ] Live control-host proof for poll-owned discovery plus recovery/release behavior. Evidence: `out/1316-coordinator-symphony-poll-owned-discovery-and-recovery/manual/20260321T164742Z-stacked-closeout/14-live-proof.md`.
