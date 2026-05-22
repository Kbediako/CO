# Task Checklist - linear-2fe8fdb4-928d-4861-9f73-44021e1a4d0b

- Linear Issue: `CO-551` / `2fe8fdb4-928d-4861-9f73-44021e1a4d0b`
- Task registry id: `linear-2fe8fdb4-928d-4861-9f73-44021e1a4d0b`
- MCP Task ID: `linear-2fe8fdb4-928d-4861-9f73-44021e1a4d0b`
- Primary PRD: `docs/PRD-linear-2fe8fdb4-928d-4861-9f73-44021e1a4d0b.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-2fe8fdb4-928d-4861-9f73-44021e1a4d0b.md`
- Canonical TECH_SPEC: `tasks/specs/linear-2fe8fdb4-928d-4861-9f73-44021e1a4d0b.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-2fe8fdb4-928d-4861-9f73-44021e1a4d0b.md`
- `.agent` mirror: `.agent/task/linear-2fe8fdb4-928d-4861-9f73-44021e1a4d0b.md`
- Parent manifest pointer: `.runs/linear-2fe8fdb4-928d-4861-9f73-44021e1a4d0b-docs-packet/cli/2026-05-21T22-26-14-450Z-12568c4c/manifest.json`
- Source anchor: `ctx:sha256:7d0b516fef794941c1aec9537d1ecb0a177327a9c0ce84e01c46d2d1efa423e4#chunk:c000001`
- Source object id: `sha256:7d0b516fef794941c1aec9537d1ecb0a177327a9c0ce84e01c46d2d1efa423e4`
- Canonical owner key: `quota-hygiene:operator-confirmed-stale-process-remediation:v1`
- Canonical owner marker: `codex-orchestrator:canonical-owner-key=quota-hygiene:operator-confirmed-stale-process-remediation:v1`

## Docs-First
- [x] PRD drafted for CO-551 operator-confirmed quota-hygiene stale-process remediation. Evidence: `docs/PRD-linear-2fe8fdb4-928d-4861-9f73-44021e1a4d0b.md`.
- [x] Canonical TECH_SPEC drafted with remediation-only contract, parity matrix, Not Done If, fallback decision, and validation plan. Evidence: `tasks/specs/linear-2fe8fdb4-928d-4861-9f73-44021e1a4d0b.md`.
- [x] TECH_SPEC mirror drafted for docs navigation. Evidence: `docs/TECH_SPEC-linear-2fe8fdb4-928d-4861-9f73-44021e1a4d0b.md`.
- [x] ACTION_PLAN drafted for parent implementation sequencing. Evidence: `docs/ACTION_PLAN-linear-2fe8fdb4-928d-4861-9f73-44021e1a4d0b.md`.
- [x] Checklist mirrored to `.agent/task`. Evidence: `.agent/task/linear-2fe8fdb4-928d-4861-9f73-44021e1a4d0b.md`.
- [x] Task registration updated in canonical `tasks/index.json`. Evidence: CO-551 entry in `tasks/index.json`.
- [x] Docs freshness registry rows added for packet files. Evidence: CO-551 rows in `docs/docs-freshness-registry.json`.
- [x] `docs/TASKS.md` snapshot entry added. Evidence: CO-551 entry in `docs/TASKS.md`.

## Source / Assumptions
- [x] Parent-provided source anchor preserved. Evidence: `ctx:sha256:7d0b516fef794941c1aec9537d1ecb0a177327a9c0ce84e01c46d2d1efa423e4#chunk:c000001`.
- [x] Source payload and manifest paths are repo-relative. Evidence: `.runs/linear-2fe8fdb4-928d-4861-9f73-44021e1a4d0b-docs-packet/cli/2026-05-21T22-26-14-450Z-12568c4c/manifest.json`.
- [x] Child lane did not call Linear mutation helpers. Evidence: packet-only docs lane.

## Acceptance Criteria
- [x] Canonical owner key is preserved. Evidence: `quota-hygiene:operator-confirmed-stale-process-remediation:v1` appears in packet, checklist, registry, and task index.
- [x] CO-542 boundary is explicit. Evidence: PRD and specs state `current detector owner CO-542 remains detection/reporting only`.
- [x] Remediation-only contract is explicit. Evidence: PRD, TECH_SPEC, ACTION_PLAN, and checklist use `remediation only`.
- [x] Explicit operator confirmation is required. Evidence: specs and action plan reject unconfirmed remediation.
- [x] Scoped targets and current-audit PID eligibility are required. Evidence: parity matrix, readiness gate, and validation plan require current-audit PID-scoped targets.
- [x] Durable per-PID audit output is required. Evidence: PRD/spec acceptance criteria and validation plan require one action/refusal record per requested PID.
- [x] Automatic kill/restart is rejected. Evidence: `Not Done If` and validation plan include `no automatic kill/restart`.
- [x] App-server/control-host restarts are rejected. Evidence: `Not Done If` and validation plan include `no app-server/control-host restarts`.
- [x] Provider-intake mutation is rejected. Evidence: `Not Done If` and validation plan include `no provider-intake mutation` and `provider-intake-state.json`.
- [x] Model calls are rejected. Evidence: `Not Done If` and validation plan include `no model calls`.
- [x] Kill-by-name behavior is rejected. Evidence: `Not Done If` and validation plan include `no kill-by-name behavior`.

## Protected Issue Terms
- [x] `quota-hygiene:operator-confirmed-stale-process-remediation:v1`
- [x] `current detector owner CO-542 remains detection/reporting only`
- [x] `remediation only`
- [x] `explicit operator confirmation`
- [x] `scoped targets`
- [x] `current-audit PID eligibility`
- [x] `durable per-PID audit output`
- [x] `no automatic kill/restart`
- [x] `no app-server/control-host restarts`
- [x] `no provider-intake mutation`
- [x] `no model calls`
- [x] `no kill-by-name behavior`

## Fallback Decision Table

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Stale process cleanup | Manual or broad-name cleanup can clear stale quota symptoms without governed evidence. | `remove fallback` | CO-551 | Operator identifies stale quota consumers in a current audit. | 2026-05-21 | 2026-05-21 | This issue | Remediation is explicit, PID-scoped, current-audit eligible, and audited per PID. | Parent-focused confirmation/eligibility/refusal tests. |
| CO-542 detector boundary | Contract name: CO-542 read-only quota-hygiene detector boundary. | `justify retaining fallback` | Owning surface: `codex-orchestrator hygiene quota` detector/reporting contract plus CO-551 remediation boundary. | Steady-state proof: detector output remains zero-model and read-only, while remediation is available only through explicit `--apply --yes --only` confirmation and current-audit PID eligibility. | CO-542 detector contract | 2026-05-21 | Non-expiring durable retention only with rationale. | Non-expiring rationale: the detector/remediator authority split is a supported safety contract, not temporary compatibility debt; remove only through a separate approved issue that preserves current-audit evidence, explicit confirmation, and read-only detector semantics. | Tests/docs: focused detector smoke, remediation command contract, and false-positive tests prove detector remains read-only while remediation is opt-in. |
| Per-PID audit output | Cleanup output could be top-level only. | `remove fallback` | CO-551 | Remediation has one or more requested PIDs. | 2026-05-21 | 2026-05-21 | This issue | Each PID has structured action/refusal evidence. | Snapshot/schema coverage for per-PID records. |

- Contract name: CO-542 read-only quota-hygiene detector boundary.
- Owning surface: `codex-orchestrator hygiene quota` detector/reporting contract plus CO-551 remediation boundary.
- Steady-state proof: detector output remains zero-model and read-only, while remediation is available only through explicit `--apply --yes --only` confirmation and current-audit PID eligibility.
- Tests/docs: focused detector smoke, remediation command contract, and false-positive tests prove detector remains read-only while remediation is opt-in.
- Non-expiring rationale: the detector/remediator authority split is a supported safety contract, not temporary compatibility debt; remove only through a separate approved issue that preserves current-audit evidence, explicit confirmation, and read-only detector semantics.

## Child-Lane Validation
- [x] Protected-term scan over declared files. Evidence: scoped `rg -n "quota-hygiene:operator-confirmed-stale-process-remediation:v1|current detector owner CO-542 remains detection/reporting only|remediation only|explicit operator confirmation|scoped targets|current-audit PID eligibility|durable per-PID audit output|no automatic kill/restart|no app-server/control-host restarts|no provider-intake mutation|no model calls|no kill-by-name behavior" ...` returned matches across the packet, task mirrors, `docs/TASKS.md`, `tasks/index.json`, and `docs/docs-freshness-registry.json`.
- [x] Scoped markdown trailing-whitespace check over declared files. Evidence: scoped `rg -n "[[:blank:]]+$" ...` returned no matches.
- [x] JSON parse for registry/index files. Evidence: `node -e "for (const p of ['tasks/index.json','docs/docs-freshness-registry.json']) { JSON.parse(require('node:fs').readFileSync(p,'utf8')); console.log(p + ' OK'); }"` printed `tasks/index.json OK` and `docs/docs-freshness-registry.json OK`.
- [x] Changed-file scope check confirms only declared files changed. Evidence: `git status --short` listed only the six CO-551 packet/checklist files plus `docs/TASKS.md`, `tasks/index.json`, and `docs/docs-freshness-registry.json`.

## Parent-Owned Implementation Validation
- [x] Unconfirmed remediation refuses without side effects. Evidence: `npm run test -- QuotaHygieneCliShell.test.ts` passed with 48 tests.
- [x] PID absent from current quota-hygiene audit refuses without side effects. Evidence: `npm run test -- QuotaHygieneCliShell.test.ts` passed with absent-PID refusal coverage.
- [x] PID identity mismatch refuses without side effects. Evidence: `npm run test -- QuotaHygieneCliShell.test.ts` passed with command/parent revalidation refusal coverage.
- [x] Stale delegate-server targets are revalidated against a fresh delegate inspection before signaling. Evidence: `npm run test -- QuotaHygieneCliShell.test.ts` passed with a regression where the raw process stayed stale but current delegate inspection no longer classified the PID as stale.
- [x] Selected delegate-server PIDs with unavailable delegate inspection fail closed with truthful per-PID refusal evidence. Evidence: `npm run test -- QuotaHygieneCliShell.test.ts` passed with a present-PID `delegate_inspection_unavailable` regression.
- [x] Operator-confirmed remediation requires explicit PID selection before signaling. Evidence: `npm run test -- QuotaHygieneCliShell.test.ts` passed with no-PID `--apply --yes --only` refusal coverage.
- [x] `--dry-run` vetoes mutation even when combined with `--apply`. Evidence: `npm run test -- QuotaHygieneCliShell.test.ts` passed with `--apply --yes --only --pids --dry-run` no-signal coverage.
- [x] GitHub polling remediation requires the process argv to execute `gh pr view`, not merely mention that command in prompt text. Evidence: `npm run test -- QuotaHygieneCliShell.test.ts` passed with a prompt-text false-positive regression.
- [x] Text-mode remediation output reports the remediation mode, counts, artifact path, and per-PID action status/reason. Evidence: `npm run test -- QuotaHygieneCliShell.test.ts` passed with dry-run and confirmed-apply text-output regressions.
- [x] Hygiene help documents `--dry-run` and the `--apply --yes --only --pid/--pids` safety contract. Evidence: `npm run test -- QuotaHygieneCliShell.test.ts` passed with exported help-text coverage.
- [x] Relative `--remediation-output` paths resolve against the configured `--repo` root. Evidence: `npm run test -- QuotaHygieneCliShell.test.ts` passed with a regression where `getCwd()` was outside `repoRoot`.
- [x] Explicit `--remediation-output` is honored for confirmation-required preflight without process mutation. Evidence: `npm run test -- QuotaHygieneCliShell.test.ts` passed with `mutation_mode=audit_artifact_write`, `artifact_written=true`, and `mode=operator_confirm_required` coverage.
- [x] Remediation mode derives from executed actions, not request shape. Evidence: `npm run test -- QuotaHygieneCliShell.test.ts` passed with confirmed apply revalidation/refusal coverage expecting `mode=no_action`.
- [x] Final artifact write failure after pre-signal evidence clears stale artifact pointers. Evidence: `npm run test -- QuotaHygieneCliShell.test.ts` passed with `audit_artifact_path=null`, preserved `artifact_error`, and `artifact_written=true` coverage.
- [x] Stale `gh pr view` polling remains remediation-detectable but is not model-quota-burning by default. Evidence: `npm run test -- QuotaHygieneCliShell.test.ts` passed with `quota_burning=false` and zero unowned critical finding coverage.
- [x] Protected app-server/control-host/provider infrastructure refuses. Evidence: `npm run test -- QuotaHygieneCliShell.test.ts` passed with active app-server, control-host, review, provider-worker, and active delegate false-positive coverage.
- [x] Eligible operator-confirmed PID attempts remediation and emits durable per-PID output. Evidence: `npm run test -- QuotaHygieneCliShell.test.ts` passed with confirmed `--apply --yes --only stale-github-polling --pids 824` SIGTERM and artifact coverage.
- [x] Kill-by-name input is rejected. Evidence: `npm run test -- QuotaHygieneCliShell.test.ts` passed with unknown `--name` rejection coverage.
- [x] App-server/control-host restart paths are not invoked. Evidence: implementation only calls injected `signalProcess(pid, 'SIGTERM')`; focused tests assert protected infrastructure is not signaled.
- [x] `provider-intake-state.json`, queue state, model settings, and Codex defaults are not mutated. Evidence: remediation dependencies are limited to process inventory, delegate inspection, optional artifact write, and signal injection; local dry-run smoke reported `read_only=true` and `mutation_mode=disabled`.
- [x] No model calls are used. Evidence: focused tests and workspace-local dry-run smoke reported `model_calls.observed=0` with `local_read_only_sources`.
- [x] Required parent validation floor is green after final review rework. Evidence: build, lint, focused tests, and full core tests passed after exact-PID/dry-run/GitHub-classifier/text-output/help/delegate-inspection-unavailable/relative-remediation-output rework.
- [x] Manifest-backed review pass. Evidence: final bounded `gpt-5.5` / `xhigh` re-review reported clean success with no actionable findings: `.runs/linear-2fe8fdb4-928d-4861-9f73-44021e1a4d0b/cli/2026-05-22T11-03-36-941Z-cf33ae48/review/output.log`, `.runs/linear-2fe8fdb4-928d-4861-9f73-44021e1a4d0b/cli/2026-05-22T11-03-36-941Z-cf33ae48/review/telemetry.json`, `.runs/linear-2fe8fdb4-928d-4861-9f73-44021e1a4d0b/cli/2026-05-22T11-03-36-941Z-cf33ae48/review/contract.json`.
- [x] Explicit elegance/minimality pass completed. Evidence: `out/linear-2fe8fdb4-928d-4861-9f73-44021e1a4d0b/manual/20260522T125500Z-elegance-review.md`.

## Parent-Owned Validation Evidence
- [x] `git diff --check` passed.
- [x] `node scripts/delegation-guard.mjs` passed with the accepted `docs-packet` child manifest.
- [x] `node scripts/spec-guard.mjs --dry-run` passed.
- [x] `npm run build` passed.
- [x] `npm run lint` passed with only existing `DelegationMcpHealth.test.ts` explicit-`any` warnings.
- [x] `npm run test -- QuotaHygieneCliShell.test.ts` passed after Codex PR review rework: 1 file, 48 tests.
- [x] `npm run test` passed after Codex PR review rework: 367 files, 6258 tests.
- [x] `npm run docs:check` passed.
- [x] `npm run docs:freshness` passed: 5571 docs, 5575 registry entries, 0 missing registry, 0 stale, 0 terminal lifecycle, 194 rolling cohort entries.
- [x] `npm run repo:stewardship` passed: 6726 tracked files, 0 action-required.
- [x] `node scripts/diff-budget.mjs` passed after Codex PR review rework with hard local scope 4 files / 206 changed lines and advisory stacked aggregate 10 files / 2967 changed lines.
- [x] `npm run pack:smoke` passed.
- [x] Workspace-local dry-run smoke passed: `bin/codex-orchestrator.js hygiene quota --format json --only stale-github-polling --stale-threshold-seconds 1` reported `read_only=true`, `mutation_mode=disabled`, `model_calls.observed=0`, `remediation.mode=dry_run`, and no audit artifact.
- [x] Final manifest-backed re-review passed with clean semantic verdict. Evidence: `.runs/linear-2fe8fdb4-928d-4861-9f73-44021e1a4d0b/cli/2026-05-22T11-03-36-941Z-cf33ae48/review/output.log`.
- [x] Explicit elegance/minimality pass found no actionable simplification. Evidence: `out/linear-2fe8fdb4-928d-4861-9f73-44021e1a4d0b/manual/20260522T125500Z-elegance-review.md`.

## Handoff Status
- [x] Child lane leaves workspace changes in place for parent patch export. Evidence: uncommitted docs packet and registry mirror changes in this child workspace.
- [x] Parent imported the docs patch and reconciled against current Linear/workpad truth. Evidence: accepted `docs-packet` child lane and updated single Codex Workpad.
- [x] Parent owns implementation and validation. Evidence: quota remediation implementation in `orchestrator/src/cli/quotaHygieneCliShell.ts`, CLI help update in `bin/codex-orchestrator.ts`, and focused tests in `orchestrator/tests/QuotaHygieneCliShell.test.ts`.
- [ ] Parent owns PR lifecycle and Linear state. Evidence: manifest-backed re-review and elegance pass are clean; PR handoff, attachment, ready-review drain, and Linear review transition remain pending.

## Notes
- This lane intentionally keeps CO-542 as the read-only detector/reporting owner and adds only explicit operator-confirmed remediation on top.
- Review/elegance handoff evidence is complete: final re-review confirmed the artifact preflight, exact PID target requirement, dry-run veto, GitHub polling argv-only classifier, PID identity/stale-age revalidation, delegate-inspection current-audit binding, delegate-inspection-unavailable refusal truthfulness, signal/termination reporting, text output, help-text fixes, relative remediation-output path handling, mode-from-executed-actions/no-action semantics, preflight remediation-output artifact writes, final artifact pointer clearing on write failure, and non-quota-burning `gh pr view` classification. Remaining work is PR lifecycle and Linear state.
