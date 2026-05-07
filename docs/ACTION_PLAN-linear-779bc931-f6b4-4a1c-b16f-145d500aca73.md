# ACTION_PLAN - CO-492 Advisory Persisted Goal Evidence Capture

## Summary
- Goal: rebuild the CO-492 docs-first packet and registry mirrors from current `origin/main` so the parent replacement branch can implement advisory persisted `/goal` evidence capture with stale PR `#788` review coverage.
- Scope: this child lane edits only the declared docs-phase packet and registry files.
- Assumptions:
  - Linear remains source of truth.
  - The parent lane owns issue state, workpad, implementation, validation, GitHub, and PR lifecycle.
  - Stale PR `#788` is acceptance evidence only, not the active PR surface.
  - `goal_evidence` is advisory provider-worker run evidence with `authority=advisory_only`.

## Rework Context
- Current `origin/main` commit in this workspace is `89dbeb05f65a2990776e294e4c16f239c952937a`.
- The provided source anchor is `ctx:sha256:3d2d783bff06744771ae73806255246cfa5f544055209f45373d48804ad1e0ba#chunk:c000001`.
- The parent-provided source payload path was absent in this child checkout, so this packet is grounded in the current issue description and local CO-486 source packet.
- This lane leaves changes uncommitted for parent patch export.

## Issue Readiness Gate
- Intent checksum / protected terms:
  - persisted `/goal`
  - goals feature
  - app-server APIs
  - model tools
  - provider-worker run evidence
  - manifest goal_evidence
  - workpad summary
  - advisory_only
  - `authority=advisory_only`
  - Linear remains source of truth
  - stale PR `#788`
- Not done if:
  - goal state can authorize Linear transitions, PR attachment, review handoff, ready-review success, merge closeout, hook recovery success, long-poll terminal status, hook/resume control integration, or TUI automation
  - disabled goals are reused as candidates
  - manifest patching writes stale fallback snapshots
  - command-runner manifest persistence drops advisory markers
  - legacy hydration backfills goal evidence without a real goal notification
  - fractional `elapsed_seconds` values are rejected
  - thread-mismatch regression coverage runs with goals off
  - stale candidate timestamps are not classified as stale
- Pre-implementation issue-quality review:
  - The lane is not a micro-task because correctness depends on protected terms, exact authority boundaries, and stale PR review acceptance coverage.
  - The lane is narrower than hook/resume control integration, TUI automation, Linear lifecycle mutation, or review/merge automation.

## Milestones & Sequencing
1. Rebuild PRD, TECH_SPEC, ACTION_PLAN, canonical spec, task checklist, and `.agent` checklist mirror.
2. Add CO-492 to `tasks/index.json` with current packet paths and rework child-lane provenance.
3. Add CO-492 packet rows to `docs/docs-freshness-registry.json`.
4. Add a `docs/TASKS.md` snapshot noting stale PR `#788` review findings and advisory-only authority.
5. Run scoped docs/JSON validation only.
6. Parent imports the patch, updates the authoritative workpad, runs docs-review, implements source/test changes, and handles replacement PR lifecycle.

## Parent-Owned Implementation Plan
- Add normalized `goal_evidence` capture to provider-worker manifest evidence assembly.
- Gate candidate reuse on goals feature availability, current thread id, source provenance, and freshness.
- Keep manifest patching from writing stale fallback snapshots.
- Ensure command-runner manifest persistence preserves advisory markers.
- Keep legacy hydration from inventing goal evidence without a real goal notification/current snapshot.
- Support fractional `elapsed_seconds`.
- Render workpad summary from persisted advisory manifest evidence only.
- Add focused tests for every stale PR `#788` review finding before replacement PR handoff.

## Parent-Owned Validation
- Focused tests:
  - disabled goals fail closed before candidate reuse
  - manifest patching does not write stale fallback snapshots
  - command-runner manifest persistence enforces advisory markers
  - legacy hydration no-backfill is tested with a real goal notification
  - `elapsed_seconds` accepts fractional seconds
  - thread-mismatch regression pins goals on
  - stale candidate timestamps classify as stale
  - workpad summary is advisory-only and manifest-derived
- Repo gates:
  - `node scripts/spec-guard.mjs --dry-run`
  - focused test commands selected by the parent
  - build/lint/test/docs gates required by the parent provider-worker lane
  - manifest-backed review and elegance/minimality pass
  - replacement PR review drain

## Child-Lane Validation
- `jq empty tasks/index.json docs/docs-freshness-registry.json`
- protected-term scan over the changed CO-492 packet files
- `git diff --check`
- scoped file-scope inspection to ensure changes stay inside declared docs-phase files

## Risks & Mitigations
- Risk: advisory goal evidence is misread as lifecycle authority.
  - Mitigation: every packet surface states `authority=advisory_only` and lists forbidden lifecycle authorizations.
- Risk: stale PR `#788` feedback is lost during replacement.
  - Mitigation: acceptance criteria and validation plan name every stale PR `#788` review finding.
- Risk: invalid goal candidates populate workpad output.
  - Mitigation: candidate validation fails closed before reuse and workpad summary renders only from persisted advisory manifest evidence.
- Risk: legacy hydration invents current evidence.
  - Mitigation: no backfill without a real goal notification/current model-tool snapshot.

## Approvals
- Reviewer: bounded same-issue docs child lane `docs-packet-rework-2026-05-07T15-57-09-661Z-55e51e78`.
- Date: 2026-05-07.
