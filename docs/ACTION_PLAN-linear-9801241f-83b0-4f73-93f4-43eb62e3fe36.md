# ACTION PLAN - CO-475 skills-release current-facing wording alignment

## Summary
- Goal: give the parent lane a docs-first packet for current-facing wording alignment in `docs/skills-release.md` keyed by `codex-cli-0128-skills-release-current-wording`.
- Scope: docs packet, task mirrors, `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` only.
- Assumptions:
  - the parent-provided source anchor is authoritative for this child lane
  - the source payload contains run metadata, not the full issue body
  - parent owns `docs/skills-release.md`
  - CO-466 release-intake is done and remains the version-posture authority
  - current local posture is Codex CLI `0.128.0` with `gpt-5.5` / `xhigh`
  - release-facing package/downstream surfaces intentionally hold at `0.125.0`
  - `cloud-canary` intentionally holds at `0.124.0`

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `current-facing wording alignment only`
  - `docs/skills-release.md`
  - Codex CLI `0.128.0`
  - `gpt-5.5` / `xhigh`
  - CO-466 release-intake done
  - `0.125.0` release-facing hold
  - `0.124.0` `cloud-canary` hold
  - canonical owner key `codex-cli-0128-skills-release-current-wording`
- Not done if:
  - this child lane edits `docs/skills-release.md`
  - current-facing wording implies `0.125.0` or `0.124.0` is current local posture
  - the packet reopens broad release-intake, package pins, cloud canary, or model defaults
  - release-facing or cloud-canary holds are weakened
  - parent validation notes omit protected-term and scoped-diff checks
- Pre-implementation issue-quality review:
  - 2026-05-05: approved for packet bootstrap. The lane is not suitable for the micro-task path because correctness depends on exact posture/version wording and protected release holds.
- Fallback / refactor decision:
  - This task touches stale/current wording and protected compatibility holds. Remove stale current-facing wording that conflicts with the CO-466 posture split; retain the `0.125.0` release-facing hold and `0.124.0` `cloud-canary` hold as parent-owned evidence-gated posture constraints.

## Milestones & Sequencing
1. Create the CO-475 PRD, TECH_SPEC mirror, canonical task spec, ACTION_PLAN, task checklist, and `.agent` mirror.
2. Register task id `20260505-linear-9801241f-83b0-4f73-93f4-43eb62e3fe36` in `tasks/index.json`.
3. Add docs freshness rows for all six packet/mirror files.
4. Add a current CO-475 snapshot to `docs/TASKS.md`.
5. Validate protected terms, JSON parsing, markdown diff hygiene, and scoped changed files.
6. Keep local edits uncommitted for parent patch export.

## Parent-Owned Follow-On Plan
1. Reconcile this packet against authoritative CO-475 Linear issue/workpad truth.
2. Run docs-review before implementation.
3. Inspect `docs/skills-release.md` for wording that presents release-facing or cloud-canary holds as current local posture.
4. Apply the smallest current-facing wording change that preserves Codex CLI `0.128.0`, `gpt-5.5` / `xhigh`, CO-466 completion, `0.125.0` release-facing hold, and `0.124.0` `cloud-canary` hold.
5. Avoid historical/spec churn unless current-facing text imports stale posture.
6. Validate with protected-term scan, scoped diff review, and any parent-selected docs checks.
7. Continue parent-owned workpad, PR, review, and Linear lifecycle.

## Dependencies
- Source anchor `ctx:sha256:23a0a0b559a0999ec797dd49596f53c617a89966c7e89cdeaccb3af2fc580c6a#chunk:c000001`.
- Child manifest `.runs/linear-9801241f-83b0-4f73-93f4-43eb62e3fe36-packet-docs/cli/2026-05-05T01-20-04-958Z-6c4f7a20/manifest.json`.
- CO-466 release-intake classification for Codex CLI `0.128.0`.
- Parent-owned `docs/skills-release.md`.

## Fallback / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? `Yes`.
- Large-refactor decision: not required because the requested change is docs wording alignment, not a runtime/release refactor.
- Canonical fallback/hold decisions live in `tasks/specs/linear-9801241f-83b0-4f73-93f4-43eb62e3fe36.md` and the PRD. This action plan keeps only the sequencing summary to avoid a second copy of the `0.125.0` release-facing and `0.124.0` `cloud-canary` hold metadata drifting.

## Validation
- Checks / tests:
  - protected-term scan across packet files
  - JSON parse for `tasks/index.json` and `docs/docs-freshness-registry.json`
  - scoped `git diff --check --` over declared files
  - scoped changed-file review to confirm no out-of-scope edits
- Rollback plan: because this lane is docs-only, parent can reject or revert only this packet plus registry rows before integration.

## Risks & Mitigations
- Risk: CO-475 duplicates CO-466 release intake.
  - Mitigation: action plan keeps CO-466 as done and limits CO-475 to current-facing wording alignment.
- Risk: parent accidentally edits version pins or cloud canary instead of wording.
  - Mitigation: Not Done If blocks package/downstream, cloud-canary, and release workflow changes.
- Risk: wording aligns local posture but deletes release-facing hold context.
  - Mitigation: protected terms require preserving the `0.125.0` release-facing hold and `0.124.0` `cloud-canary` hold.
- Risk: validation is too broad for the child lane.
  - Mitigation: child checks are limited to protected terms, JSON parse, diff hygiene, and scoped status.

## Approvals
- Docs packet child lane: produced in this workspace for parent patch export.
- Parent docs-review and implementation validation: pending parent lane.
- Date: 2026-05-05
