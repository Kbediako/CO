# ACTION_PLAN - CO Evaluate DNS-aware Runtime-Proof Reviewer Reachability Checks

## Added by Bootstrap (refresh as needed)

## Traceability
- Linear issue: `CO-23` / `da290822-55a2-4794-8caa-3a6f1d9c3eff`
- Linear URL: https://linear.app/asabeko/issue/CO-23/co-evaluate-dns-aware-runtime-proof-reviewer-reachability-checks

## Summary
- Goal: finish Linear issue `CO-23` by deciding and implementing the correct runtime-proof reviewer reachability contract without regressing the deterministic default posture.
- Scope: docs-first packet, baseline audit note, single persistent Linear workpad, pre-implementation docs-review, extending the existing CO-8 runtime-proof helper on current `main`, explicit opt-in DNS-aware mode evaluation/implementation, focused tests, required validation, and normal PR/review handoff.
- Assumptions:
  - the live CO review handoff state is `In Review`
  - current `origin/main` already contains the CO-8 runtime-proof baseline from PR `#308`
  - this run may need a documented delegation override if task-scoped delegation cannot be executed cleanly in-session

## Milestones & Sequencing
1. Register the CO-23 docs-first packet, update `tasks/index.json`, update `docs/TASKS.md`, record the baseline audit note, and refresh the single active workpad with the actual starting condition.
2. Run docs-review before touching implementation code.
3. Refresh the docs/task packet against current `origin/main` so CO-23 only tracks the remaining reviewer-reachability contract gap.
4. Add `--reachability-mode <deterministic|dns-public>` and the bounded DNS-aware validation contract, including structured reachability metadata and explicit caveats.
5. Update README/help/worker guidance/tests so the deterministic default and opt-in DNS-aware mode are both discoverable and truthful.
6. Run the required validation sequence, refresh the docs packet and workpad, and only hand off if the lane is actually review-ready.

## Dependencies
- `bin/codex-orchestrator.ts`
- `orchestrator/src/cli/linearCliShell.ts`
- `orchestrator/src/cli/providerLinearWorkerRunner.ts`
- the existing runtime-proof helper under `orchestrator/src/cli/control/providerLinearRuntimeProof.ts`
- `orchestrator/src/cli/control/providerLinearWorkflowAudit.ts`
- `scripts/design/pipeline/permit.js`
- `skills/linear/SKILL.md`
- `docs/README.md`
- `orchestrator/tests/LinearCliShell.test.ts`
- the new focused runtime-proof test coverage to be added under `orchestrator/tests/`
- `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`
- `orchestrator/tests/ProviderLinearWorkflowAudit.test.ts`
- `tests/linear-cli-help.spec.ts`

## Validation
- Checks / tests:
  - `node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" start docs-review --format json --no-interactive --task linear-da290822-55a2-4794-8caa-3a6f1d9c3eff-docs-review`
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `node scripts/diff-budget.mjs`
  - `npm run review`
  - `npm run pack:smoke`
- Rollback plan:
  - revert the DNS-aware mode if it changes the default deterministic contract or produces ambiguous reviewer-reachability claims
  - keep the upstream CO-8 runtime-proof baseline intact if CO-23-specific logic needs to be rolled back

## Risks & Mitigations
- Risk: stale CO-23 docs still describe the pre-`#308` missing-helper state and cause the lane to overreach.
  - Mitigation: refresh the docs/task packet against current `origin/main` before treating any remaining diff as in-scope implementation.
- Risk: DNS-aware validation is misread as an authoritative reviewer guarantee.
  - Mitigation: keep the flag explicit, name it `dns-public`, and carry a worker-local DNS caveat in docs and output.
- Risk: DNS resolution introduces flaky tests or network dependencies.
  - Mitigation: keep deterministic mode as default and stub all DNS-aware tests.

## Approvals
- Reviewer: delegated docs-review guard stages passed; forced review stage drifted, so manual pre-implementation approval is recorded with an override note
- Date: 2026-03-27

## Manifest Evidence
- Baseline audit: `out/linear-da290822-55a2-4794-8caa-3a6f1d9c3eff/manual/20260327T075424Z-baseline-audit.md`
- Docs review manifest: `.runs/linear-da290822-55a2-4794-8caa-3a6f1d9c3eff-docs-review/cli/2026-03-27T07-59-26-687Z-b3902cf6/manifest.json`
- Docs review override: `out/linear-da290822-55a2-4794-8caa-3a6f1d9c3eff/manual/20260327T080637Z-docs-first/05-docs-review-override.md`
