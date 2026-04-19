# ACTION_PLAN: CO-266 blocked terminal blocker cleanup advisory

## Goal

Prepare and hand off a docs-first `CO-266` packet and parent implementation for a narrow `read-only advisory`: surface `Blocked issues` whose `terminal blockers` make them plausible `ready-to-unblock candidate` or `duplicate-cleanup candidate` items, with required evidence fields and without mutating Linear state.

## Constraints

- This child lane edits only docs and registry mirror files in the declared scope.
- Do not edit implementation or tests from this lane.
- Do not call Linear mutation helpers.
- Do not run full repo validation suites.
- Do not auto-close issues by default.
- Do not weaken non-terminal blocker semantics.
- Do not relaunch `Blocked issues` directly.
- Do not replace CO-259 canonical-owner reuse.

## Source Evidence

- Linear issue: `CO-266`
- Issue id: `025f5748-bed9-4512-9fd6-53ad57dd1466`
- Source anchor: `ctx:sha256:cd9f197bda0c6e6ad7bdb511952c54337b8582a1789b66f97d0a3192d8e4d29e#chunk:c000001`
- Source object id: `sha256:cd9f197bda0c6e6ad7bdb511952c54337b8582a1789b66f97d0a3192d8e4d29e`
- Declared source payload: `.runs/linear-025f5748-bed9-4512-9fd6-53ad57dd1466-docs-packet/cli/2026-04-19T21-54-28-881Z-fe2b535a/memory/source-0/source.txt`
- Declared manifest: `.runs/linear-025f5748-bed9-4512-9fd6-53ad57dd1466-docs-packet/cli/2026-04-19T21-54-28-881Z-fe2b535a/manifest.json`
- Canonical owner key: `blocked-terminal-blocker-cleanup-advisory`
- Source caveat: the source payload available to this lane carries run metadata plus issue id, identifier, and updated_at only. This action plan preserves the parent-provided issue-shaping contract; no Linear mutation was performed.

## Issue Readiness Gate

- Intent checksum / protected terms carried forward:
  - `Blocked issues`
  - `terminal blockers`
  - `operator-autopilot`
  - `duplicate-cleanup candidate`
  - `ready-to-unblock candidate`
  - `read-only advisory`
  - `blocked-terminal-blocker-cleanup-advisory`
  - `issue id`
  - `live state`
  - `blocker list`
  - `canonical/duplicate hints`
  - `recommended action`
- Not done if:
  - advisory generation auto-closes, auto-deduplicates, unblocks, relaunches, or transitions issues
  - a non-terminal blocker can produce a `ready-to-unblock candidate`
  - any required evidence field is absent
  - CO-259 canonical-owner reuse is replaced
  - duplicate cleanup and ready-to-unblock recommendations are collapsed into one ambiguous state
- Pre-implementation issue-quality review:
  - 2026-04-20: child-lane review confirms the scope is a read-only operator advisory for blocked issues with all terminal blockers. The accepted contract is evidence-first operator visibility, not mutation. The packet rejects auto-close behavior, non-terminal blocker weakening, direct relaunch of `Blocked issues`, and any replacement of CO-259 exact canonical-owner reuse.

## Plan

1. Create the PRD, TECH_SPEC, ACTION_PLAN, task spec mirror, task checklist, and agent task mirror for `linear-025f5748-bed9-4512-9fd6-53ad57dd1466`.
2. Register the packet in `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
3. Preserve required evidence fields across the packet:
   - `issue id`
   - `live state`
   - `blocker list`
   - `canonical/duplicate hints`
   - `recommended action`
4. Record wrong interpretations, non-goals, `Not Done If`, and current/reference/target parity matrix.
5. Run only scoped docs/JSON validation and leave the patch in the child lane workspace for parent export.

## Parent Implementation Plan

1. [x] Inspect the current issue/blocker read path and choose the smallest parent-owned implementation surface for advisory classification.
2. [x] Add all-terminal blocker classification for live `Blocked issues`.
3. [x] Keep any non-terminal or unknown blocker as a suppressing reason.
4. [x] Emit structured advisory records with `issue id`, `live state`, `blocker list`, `canonical/duplicate hints`, and `recommended action`.
5. [x] Surface the records through `operator-autopilot` and the provider workflow read model as a `read-only advisory`.
6. [x] Preserve CO-259 canonical-owner reuse by using `blocked-terminal-blocker-cleanup-advisory` only as an exact evidence hint, not mutation authority.
7. [x] Add focused tests for all-terminal blockers, mixed blockers, duplicate/canonical hints, no-mutation behavior, and output field completeness.
8. [x] Run parent-owned focused validation plus the normal review flow before PR handoff.

## Parent Implementation Result

- `operator-autopilot` emits additive `terminal_blocker_advisories` for live `Blocked issues` whose blockers are all terminal.
- `duplicate_cleanup` candidates require duplicate relation or canonical-owner marker evidence; otherwise advisory records use `ready_to_unblock`.
- Provider workflow persistence and observability read-model projection preserve the advisory payload for operator inspection.
- Advisory generation is read-only and does not call Linear transition, close, duplicate, relaunch, or follow-up mutation helpers.

## Dependencies

- Existing Linear issue/blocker read data.
- Existing CO-259 canonical-owner reuse semantics.
- Parent-selected operator-facing `operator-autopilot` or read-model surface.

## Validation

- Child-lane checks:
  - scoped JSON parse for `tasks/index.json` and `docs/docs-freshness-registry.json`
  - protected-term search over the touched docs and registry files
  - scoped `git diff --check`
  - trailing-whitespace check over touched files
- Parent-lane checks:
  - focused classification tests
  - focused read-only/no-mutation tests
  - focused output-shape tests for required evidence fields
  - focused compatibility check for CO-259 canonical-owner reuse
- Rollback plan:
  - revert parent advisory generation if it mutates Linear state or weakens non-terminal blockers
  - retain the docs packet as the issue-shaping contract until parent narrows or widens ownership explicitly

## Risks & Mitigations

- Risk: advisory logic is too eager and treats stale cached terminal blockers as live truth.
  - Mitigation: require live or parent-approved authoritative issue state and fail closed on unknown blocker state.
- Risk: duplicate cleanup turns into auto-close behavior.
  - Mitigation: keep `duplicate-cleanup candidate` as a recommendation only.
- Risk: parent duplicates CO-259 canonical-owner logic.
  - Mitigation: use only the exact key `blocked-terminal-blocker-cleanup-advisory` through the existing CO-259-compatible path.
- Risk: operator cannot act because evidence is incomplete.
  - Mitigation: require `issue id`, `live state`, `blocker list`, `canonical/duplicate hints`, and `recommended action`.

## Exit Criteria For This Child Lane

- Docs-first packet files exist in the declared scope.
- Registry mirrors are updated in the declared scope with review date `2026-04-20`.
- Protected terms are present across the packet and mirrors.
- JSON registries parse.
- Scoped diff/trailing-whitespace checks pass.
- No implementation or test files are edited.
- No commit is created.
