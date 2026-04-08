# PRD - CO: Fix launchd-supervised control-host child runtime PATH so provider-worker launches resolve node and appserver/login probes truthfully

## Added by Bootstrap 2026-04-09

## Traceability
- Linear issue: `CO-115` / `bf0ba9ec-47f0-45ac-be83-490df0f0b45d`
- Linear URL: https://linear.app/asabeko/issue/CO-115/co-fix-launchd-supervised-control-host-child-runtime-path-so-provider
- Concrete reproducer: `CO-87` / `885a6ce9-7766-4296-be19-57e624769d46`

## Summary
- Problem Statement: after the local root `control-host` moved under launchd supervision, live Linear discovery and authenticated `/api/v1/dispatch` recovered enough to recommend and admit newly readied work, but the admitted provider-worker child run still launches through bare `node` from the `provider-linear-worker` pipeline stage. Under the launchd-owned non-interactive runtime, that child shell exits `127` with `/bin/sh: node: command not found`, so real issue work never starts and retry or reconcile noise obscures the primary launch-contract failure.
- Desired Outcome: make the root-host-to-child-run runtime contract truthful under launchd-owned PATH and environment constraints so provider-worker child runs either start real work successfully or fail closed with an explicit machine-checkable runtime-parity error, while the same runtime contract also keeps appserver or login probe behavior truthful instead of creating misleading fallback or retry churn.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): fix the specific launchd-supervised child-runtime seam that blocks provider-worker issue admission after dispatch and intake already succeeded. The worker child launch must no longer rely on an interactive shell PATH containing Homebrew Node, and runtime provider probing must report truthful launch/runtime availability under the same launchd-owned environment.
- Success criteria / acceptance:
  - a launchd-supervised root `control-host` can spawn provider-worker child runs without `/bin/sh: node: command not found`
  - the child-launch command uses a runtime contract that remains valid under launchd-owned PATH and environment, not only in an interactive shell
  - a newly readied issue in the `CO-87` shape either starts real provider work or fails with an explicit machine-checkable runtime-parity error instead of silent retry churn
  - appserver or login probe behavior under the same child runtime stays truthful and bounded
  - focused regression or reproducer coverage exists for launchd root host -> admitted Ready issue -> child launch execution under non-interactive PATH and environment
- Constraints / non-goals:
  - do not reopen the older `CO-41` stale-refresh wedge unless new evidence proves the same seam
  - do not reopen the launchd provider-env bootstrap fix that restored live dispatch credentials
  - do not broaden into general STATUS, rate-limit, dashboard, or unrelated bootstrap work
  - do not change the actual implementation scope of `CO-87`; this lane is infrastructure blocking issue admission

## Intent Checksum
- Exact user wording / phrases to preserve:
  - `launchd-supervised control-host child runtime PATH`
  - `provider-worker launches resolve node`
  - `appserver/login probes truthfully`
  - `/bin/sh: node: command not found`
  - `CO-87`
  - `runtime-parity error`
  - `launchd-owned PATH/env`
- Protected terms / exact artifact and surface names:
  - `provider-linear-worker`
  - `providerLinearWorkerRunner.js`
  - `codex.orchestrator.json`
  - `control-host`
  - `/api/v1/dispatch`
  - `resolveProviderLinearWorkerRuntimeContext`
  - `resolveCodexCliBin`
  - `appserver`
  - `login status`
  - `command not found`
- Nearby wrong interpretations to reject:
  - "this is the old `CO-41` refresh wedge again"
  - "dispatch is still broken, so fix intake or auth first"
  - "only the top-level root host needs an absolute Node path"
  - "falling back from appserver to cli is truthful even when the runtime cannot launch either path"
  - "the right fix is to broaden into dashboard or provider-status cleanup"

## Parity / Alignment Matrix
- Current truth:
  - the launchd supervisor starts the root `control-host` with an absolute Node path, so the root host itself runs
  - the spawned `provider-linear-worker` stage still shells out through bare `node "$CODEX_ORCHESTRATOR_PACKAGE_ROOT/dist/orchestrator/src/cli/providerLinearWorkerRunner.js"`
  - under the launchd-owned non-interactive runtime, the child manifest exits `127` with `/bin/sh: node: command not found`
  - runtime provider preflight still resolves the Codex CLI from ambient PATH or optional overrides, so appserver or login fallback can look healthier than the launch/runtime contract really is under launchd
- Reference truth:
  - the root host and its admitted child runs should share a launch/runtime contract that remains valid under launchd-owned PATH and environment
  - provider-runtime preflight should distinguish real runtime availability from missing executable resolution and fail closed with explicit machine-checkable truth
- Target truth / intended delta:
  - child provider-worker launch uses an explicit runtime contract that does not depend on interactive-shell PATH contents
  - runtime provider probes fail closed with explicit launch/runtime parity truth when required executables are unavailable under launchd
  - admitted Ready issues in the `CO-87` shape either start real work or stop with explicit runtime-parity proof instead of shell `127` churn
- Explicitly out-of-scope differences:
  - revisiting stale-refresh lifecycle handling from `CO-41`
  - dispatch credential/bootstrap work already repaired elsewhere
  - dashboard or STATUS presentation changes

## Not Done If
- The admitted child run can still fail with `/bin/sh: node: command not found`.
- The child launch still depends on interactive-shell PATH state instead of an explicit launch contract.
- Runtime provider preflight still reports misleading appserver or login fallback truth when executable resolution is the real blocker.
- The final proof cannot classify the failure as launch/runtime parity when real work still cannot start.

## Goals
- Make the `provider-linear-worker` child launch contract valid under launchd-owned PATH and environment.
- Keep runtime provider preflight truthful for appserver and login probes under the same environment.
- Replace silent retry or reconcile churn with explicit machine-checkable runtime-parity failure when real work cannot start.
- Add focused regression and reproducer coverage for the launchd child-runtime seam.

## Non-Goals
- Reopening `CO-41` without new evidence.
- Revisiting dispatch/bootstrap credential fixes.
- Broad provider observability or dashboard changes.
- Changing `CO-87` feature scope instead of the blocking infrastructure seam.

## Stakeholders
- Product: operators expecting ready issues to start real work once dispatch recommends them
- Engineering: control-host, command runner, runtime provider, and provider-worker maintainers
- Design: N/A

## Metrics & Guardrails
- Primary Success Metrics:
  - launchd-supervised provider-worker child runs stop failing on bare `node`
  - runtime provider probe outcomes reflect actual launch/runtime availability under launchd
  - focused tests lock the non-interactive PATH or environment reproducer and explicit failure classification
- Guardrails / Error Budgets:
  - preserve the repaired live dispatch and intake path
  - keep the fix bounded to launch/runtime parity for child runs
  - prefer explicit runtime-contract fields over wider environment mutation

## User Experience
- Personas:
  - operator moving a queued issue to `Ready` and expecting provider work to start
  - reviewer diagnosing a failed admitted child run from manifests and proof artifacts
- User Journeys:
  - a newly admitted Ready issue starts the provider worker under launchd without depending on interactive-shell PATH
  - when runtime prerequisites are missing, the proof and summary say so explicitly instead of surfacing generic retry churn
  - runtime provider probing reflects the same executable availability that the child launch path will actually use

## Technical Considerations
- Architectural Notes:
  - preserve the root host's launchd-safe runtime while extending the same truth to child-stage execution
  - prefer explicit parent-owned runtime env such as the current Node executable path over ambient PATH assumptions
  - make runtime-parity failures machine-checkable at the worker proof layer instead of relying on outer shell exit text
- Dependencies / Integrations:
  - `codex.orchestrator.json`
  - `orchestrator/src/cli/services/commandRunner.ts`
  - `orchestrator/src/cli/controlHostCliShell.ts`
  - `orchestrator/src/cli/providerLinearWorkerRunner.ts`
  - `orchestrator/src/cli/runtime/provider.ts`
  - `orchestrator/src/cli/utils/codexCli.ts`
  - `orchestrator/src/cli/control/providerLinearWorkerTruth.ts`

## Open Questions
- Is the smallest truthful Codex CLI contract under launchd to continue requiring `CODEX_CLI_BIN` or managed-bin resolution, or should the worker classify missing ambient `codex` resolution as an explicit runtime-parity failure without changing the binary source?
- Should the parent stage inject only the Node executable path, or should launch-contract metadata also persist an explicit runtime-provider resolution source for clearer downstream proofs?

## Approvals
- Product: self-approved from the Linear issue scope
- Engineering: `codex-orchestrator docs-review` child stream passed `spec-guard` and `docs:check` after the `docs/TASKS.md` archive trim, then failed only on the standing repo-wide `docs:freshness` baseline; manual fallback accepted via `.runs/linear-bf0ba9ec-47f0-45ac-be83-490df0f0b45d-co-115-docs-review/cli/2026-04-08T17-32-15-382Z-fc180ff1/manifest.json` and `out/linear-bf0ba9ec-47f0-45ac-be83-490df0f0b45d/manual/20260408T173215Z-docs-review-fallback.md`
- Design: N/A
