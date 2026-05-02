# Task Checklist - linear-77fc72a8-6cc4-4a47-84cd-7b0dfd18bfaf

- Linear Issue: `CO-485` / `77fc72a8-6cc4-4a47-84cd-7b0dfd18bfaf`
- Task registry id: `20260502-linear-77fc72a8-6cc4-4a47-84cd-7b0dfd18bfaf`
- MCP Task ID: `linear-77fc72a8-6cc4-4a47-84cd-7b0dfd18bfaf`
- Primary PRD: `docs/PRD-linear-77fc72a8-6cc4-4a47-84cd-7b0dfd18bfaf.md`
- TECH_SPEC: `tasks/specs/linear-77fc72a8-6cc4-4a47-84cd-7b0dfd18bfaf.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-77fc72a8-6cc4-4a47-84cd-7b0dfd18bfaf.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-77fc72a8-6cc4-4a47-84cd-7b0dfd18bfaf.md`
- Child lane manifest: `.runs/linear-77fc72a8-6cc4-4a47-84cd-7b0dfd18bfaf-docs-packet-bootstrap/cli/2026-05-02T12-25-28-667Z-edf96fa7/manifest.json`
- Source anchor: `ctx:sha256:7b8009ed1070b9651f8299646e34cc07a9edf0d71d948584365cd01269075452#chunk:c000001`
- Canonical owner key: `codex-cli-0128:permission-profile-trust-flow-rebaseline`

## Docs-First
- [x] PRD drafted with intent checksum, parity matrix, explicit non-goals, Not Done If, and fallback/refactor decisions. Evidence: `docs/PRD-linear-77fc72a8-6cc4-4a47-84cd-7b0dfd18bfaf.md`.
- [x] TECH_SPEC drafted with issue-shaping contract, readiness gate, technical requirements, fallback/refactor decisions, and validation plan. Evidence: `tasks/specs/linear-77fc72a8-6cc4-4a47-84cd-7b0dfd18bfaf.md`, `docs/TECH_SPEC-linear-77fc72a8-6cc4-4a47-84cd-7b0dfd18bfaf.md`.
- [x] ACTION_PLAN drafted for parent sequencing. Evidence: `docs/ACTION_PLAN-linear-77fc72a8-6cc4-4a47-84cd-7b0dfd18bfaf.md`.
- [x] Checklist mirrored to `.agent/task`. Evidence: `.agent/task/linear-77fc72a8-6cc4-4a47-84cd-7b0dfd18bfaf.md`.
- [x] Task registration mirrors updated in declared scope. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Parent docs-review or equivalent packet review completed. Evidence: docs-review child stream `.runs/linear-77fc72a8-6cc4-4a47-84cd-7b0dfd18bfaf-docs-review/cli/2026-05-02T12-36-30-580Z-c491c516/manifest.json`; P1 date-format finding was fixed in the packet fallback rows before implementation.

## Protected Issue Terms
- [x] Codex CLI 0.128.0
- [x] permission profiles
- [x] sandbox profile config controls
- [x] cwd controls
- [x] active-profile metadata
- [x] `--full-auto` deprecation
- [x] trust flows
- [x] doctor/default setup
- [x] provider-worker prompts

## Non-Goals
- [x] No broad 0.128 release-intake duplicate; CO-466 remains the broad release-intake owner.
- [x] No portable `gpt-5.4` fallback default changes.
- [x] No automatic weakening of sandbox/approval safety.
- [x] No historical-spec churn unless current-facing guidance imports stale wording.
- [x] No Linear/GitHub/workpad/PR lifecycle mutation by this child lane.

## Not Done If
- Current-facing docs/prompts recommend `--full-auto` as normal.
- Permission-profile distinction is omitted.
- Doctor/default setup cannot identify profile-backed posture drift.
- Validation lacks focused tests or live command evidence.

## Child Lane Scope
- [x] Stayed docs-only. Evidence: this child lane edits only the declared docs/task/registry files.
- [x] Source payload absence recorded. Evidence: source payload path from the parent brief was not present in this child checkout; packet is anchored on source anchor `ctx:sha256:7b8009ed1070b9651f8299646e34cc07a9edf0d71d948584365cd01269075452#chunk:c000001` and parent-provided issue contract.
- [x] Fallback-expiry decisions recorded. Evidence: packet records `remove fallback` for stale `--full-auto` normal-flow guidance and trust-flow shorthand, plus `expire fallback` for doctor/default setup posture drift.

## Fallback / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? `Yes`.
- Large-refactor decision: not required for this bounded rebaseline; ownership remains in existing current-facing docs, doctor/default setup, and review-wrapper surfaces.
- Minor-seam decision: acceptable only for the temporary legacy Codex config retry while 0.124/0.125 release-facing pins still reject `default_permissions`.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `--full-auto` current guidance | Deprecated flag remains normal recommendation. | remove fallback | CO-485 | Current-facing docs/prompts recommend `--full-auto`. | pre-0.128 guidance | 2026-05-02 | N/A after removal | Current guidance uses permission profiles or marks historical examples as deprecated/migration-only. | Protected-term scan plus focused parent validation. |
| Doctor/default setup drift | Profile-backed posture is checked through old fields only. | expire fallback | CO-485 | Active profile differs from expected sandbox profile config controls or cwd controls. | 2026-05-02 | 2026-05-02 | 2026-06-01 | Doctor/default setup reports active-profile metadata and drift. | Parent-owned focused test or live command evidence. |
| Review-wrapper retry (0.124/0.125 compatibility) | Legacy `sandbox_mode="read-only"` retry after `default_permissions` rejection. | expire fallback | CO-485 | Active Codex CLI rejects `default_permissions` while release-facing pins remain at or below 0.125. | 2026-05-02 | 2026-05-02 | 2026-06-01 | Release-facing pins move beyond 0.125 or the pinned CLI accepts `default_permissions`. | Focused review-launch regression plus local probes: `npx -y -p @openai/codex@0.125.0 codex -c 'default_permissions=":read-only"' debug prompt-input 'hi'` and the matching 0.124 probe rejected `default_permissions`, while `sandbox_mode="read-only"` remained accepted. |
| Trust-flow shorthand | Cwd trust is treated as full permission posture. | remove fallback | CO-485 | Guidance conflates cwd controls, trust flows, permission profiles, and sandbox controls. | pre-0.128 guidance | 2026-05-02 | N/A after removal | Guidance separates the controls. | Parent-owned prompt/docs scan plus focused validation. |

## Parent-Owned Implementation / Closeout
- [x] Audit current-facing docs and provider-worker prompts for stale `--full-auto` normal-flow recommendations. Evidence: scoped `rg -- '--full-auto'` left only current-facing deprecation guidance plus intentionally historical autonomy PRD/TECH_SPEC mentions.
- [x] Distinguish permission profiles, sandbox profile config controls, cwd controls, active-profile metadata, and trust flows in selected surfaces. Evidence: `AGENTS.md`, `templates/codex/AGENTS.md`, `docs/guides/cloud-mode-preflight.md`, `docs/guides/codex-version-policy.md`, `docs/standalone-review-guide.md`, and `skills/codex-orchestrator/SKILL.md`.
- [x] Update doctor/default setup so profile-backed posture drift is identifiable. Evidence: `orchestrator/src/cli/doctor.ts` flags `default_permissions = ":danger-no-sandbox"` as a local-only security advisory; `orchestrator/tests/Doctor.test.ts` covers the profile-backed posture.
- [x] Preserve portable `gpt-5.4` fallback defaults and sandbox/approval safety. Evidence: no model default changes; review retry override now uses `default_permissions=":read-only"` instead of weakening approvals/sandbox posture.
- [x] Provide focused tests or live command evidence. Evidence: live `/opt/homebrew/bin/codex` 0.128.0 command/source evidence, focused vitest runs for doctor and review-launch behavior, and compatibility probes where `npx -y -p @openai/codex@0.125.0 codex -c 'default_permissions=":read-only"' debug prompt-input 'hi'` plus the matching 0.124 probe rejected `default_permissions` while `sandbox_mode="read-only"` remained accepted.
- [x] Run parent-owned docs-review and validation. Evidence: docs-review and implementation-gate child streams plus parent validation through delegation guard, spec guard, build, lint, full test, docs checks, docs freshness, repo stewardship, diff budget, and pack smoke.
- [ ] Complete PR lifecycle and Linear review handoff.

## Validation
- [x] JSON parse check for `tasks/index.json` and `docs/docs-freshness-registry.json`. Evidence: `node -e "JSON.parse(require('fs').readFileSync('tasks/index.json','utf8')); JSON.parse(require('fs').readFileSync('docs/docs-freshness-registry.json','utf8')); console.log('json ok')"` returned `json ok`.
- [x] Scoped diff hygiene check over declared files. Evidence: `git diff --check -- <declared files>` returned clean.
- [x] Protected-term coverage scan across packet files and mirrors. Evidence: scoped `rg` found all protected terms and canonical owner key.
- [x] Scoped status review confirms edits stayed inside declared file scope. Evidence: `git status --short` showed only the declared docs packet and registry mirror files.
- [x] Docs-review child stream completed. Evidence: `.runs/linear-77fc72a8-6cc4-4a47-84cd-7b0dfd18bfaf-docs-review/cli/2026-05-02T12-36-30-580Z-c491c516/manifest.json`; packet date finding fixed and `node scripts/spec-guard.mjs --dry-run` passed after the fix.
- [x] Focused code tests passed. Evidence: `npx vitest run --config vitest.config.core.ts tests/review-launch-attempt.spec.ts orchestrator/tests/Doctor.test.ts`, `npx vitest run --config vitest.config.core.ts tests/run-review.spec.ts -t "retries explicit scoped bounded review after validation command intent"`, and `npx vitest run --config vitest.config.core.ts tests/run-review.spec.ts -t "documents scoped launch prompt handling"`.
- [x] Implementation-gate child stream completed. Evidence: `.runs/linear-77fc72a8-6cc4-4a47-84cd-7b0dfd18bfaf-implementation-gate/cli/2026-05-02T12-47-23-409Z-5a389c34/manifest.json`; review telemetry reports `status=succeeded`, `review_outcome=clean-success`.
- [x] Standalone review finding fixed. Evidence: review found normal doctor missed `default_permissions = ":danger-no-sandbox"`; parent added normal doctor `security_advisories`, warning status, summary output, and focused Doctor regression coverage.
- [x] Full parent validation passed after the review fix. Evidence: `node scripts/delegation-guard.mjs`, `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint` (3 pre-existing `DelegationMcpHealth.test.ts` warnings), `npm run test` (359 files, 5,253 tests), `npm run docs:check`, `npm run docs:freshness`, `npm run repo:stewardship`, `node scripts/diff-budget.mjs`, and `npm run pack:smoke`.
- [x] Final standalone review completed cleanly. Evidence: `.runs/linear-77fc72a8-6cc4-4a47-84cd-7b0dfd18bfaf/cli/2026-05-02T12-21-38-533Z-2304afcc/review/telemetry.json` reports `status=succeeded`, `review_outcome=clean-success`, `termination_boundary=null`.
- [x] Elegance/minimality pass completed. Evidence: `out/linear-77fc72a8-6cc4-4a47-84cd-7b0dfd18bfaf/manual/elegance-review.md`; no simplification patch applied.

## Progress Log
- 2026-05-02: Bounded same-issue docs child lane created the CO-485 docs-first packet and declared mirrors only. The packet preserves Codex CLI 0.128.0, permission profiles, sandbox profile config controls, cwd controls, active-profile metadata, `--full-auto` deprecation, trust flows, doctor/default setup, and provider-worker prompts.
- 2026-05-02: Packet keeps CO-466 as the broad release-intake owner, rejects portable `gpt-5.4` fallback changes, rejects sandbox/approval safety weakening, and avoids historical-spec churn unless stale wording is imported into current-facing guidance.
- 2026-05-02: Child lane scoped validation passed: JSON parse, scoped `git diff --check`, protected-term scan, and scoped status review.
- 2026-05-02: Parent imported the docs child patch manually after the Linear helper invalidated child acceptance due to a parent workpad `updated_at` race; `git apply --check` passed before import.
- 2026-05-02: Parent implementation replaced the bounded review retry read-only override with the 0.128 profile-backed `default_permissions=":read-only"` override, added `:danger-no-sandbox` doctor advisory coverage, and refreshed current-facing docs/templates away from normal `--full-auto` guidance.
- 2026-05-02: Implementation-gate child stream completed with build, lint, test, docs checks, docs freshness, diff budget, and clean standalone review evidence. Parent validation chain and PR lifecycle remain pending.
- 2026-05-02: Parent standalone review found normal doctor did not surface `:danger-no-sandbox`; parent fixed the normal doctor surface and reran focused Doctor tests, full validation, and pack smoke cleanly.
- 2026-05-02: Final standalone review completed cleanly and the elegance pass retained the small compatibility fallback intentionally. PR lifecycle remains pending.

## Notes
- NOTES: Goal: Bootstrap CO-485 docs-first packet for Codex CLI 0.128 permission-profile/trust-flow rebaseline. | Summary: Child lane adds docs/task packet and registry mirrors only; parent owns implementation and validation. | Risks: Do not duplicate CO-466 release intake, do not recommend `--full-auto` as normal, do not omit permission-profile distinctions, and do not weaken sandbox/approval safety.
