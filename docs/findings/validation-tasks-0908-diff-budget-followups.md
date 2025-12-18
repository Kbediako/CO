# Validation Report — Task 0908 (Diff Budget + Review Handoff Follow-ups)

- Source checklist: `tasks/tasks-0908-diff-budget-followups.md`
- Validation date: 2025-12-18
- Repo state: `main` @ `817150e` (`git log -1 --oneline`)

## SOPs / Templates Used

No dedicated “validation report” template was found. This report follows the repo’s general evidence + guardrail conventions:

- Canonical task tracking lives in `/tasks`; `/docs` are mirrors and supporting material (`.agent/readme.md:8-22`).
- “Implementation complete gate” (non-interactive) command list includes `node scripts/diff-budget.mjs` and recommends `NOTES="<goal + what changed + any risks>" npm run review` (`.agent/system/conventions.md:11-20`).
- CI core lane runs diff budget on PRs (`.github/workflows/core-lane.yml:25-31`).

## Follow-up Tasks (from `tasks/tasks-0908-diff-budget-followups.md:24-52`)

- CI override path (without weakening default gate): `tasks/tasks-0908-diff-budget-followups.md:26-34`
- Diff-budget test coverage: `tasks/tasks-0908-diff-budget-followups.md:36-45`
- README updates (diff-budget + review handoff): `tasks/tasks-0908-diff-budget-followups.md:47-52`

## Planning Collateral (added to support follow-ups)

- PRD: `docs/PRD-diff-budget-followups.md`
- Tech Spec: `docs/TECH_SPEC-diff-budget-followups.md`
- Action Plan: `docs/ACTION_PLAN-diff-budget-followups.md`
- Mini-spec: `tasks/specs/0908-diff-budget-followups.md`

## Summary

| Task | Status | Evidence | Verification |
| --- | --- | --- | --- |
| CI override path for diff-budget | 🟡 Partial | `.github/workflows/core-lane.yml:25-31`, `scripts/diff-budget.mjs:257-399` | Manual diff-budget runs (override/no-override) + workflow search for label logic |
| Tests for `scripts/diff-budget.mjs` | ❌ Not validated | `scripts/diff-budget.mjs`, `(no tests found)` | `rg -n "diff-budget" tests` |
| README diff-budget + `NOTES="..." npm run review` | 🟡 Partial | `README.md:106-107`, `README.md:149`, `.agent/system/conventions.md:18-19` | `rg` searches show no diff-budget/NOTES invocation guidance in README |

## Task-by-task Validation

### 1) CI override path for diff-budget

**Checklist item:** `tasks/tasks-0908-diff-budget-followups.md:26-34`

**What exists**
- CI runs diff budget for PRs: `.github/workflows/core-lane.yml:25-31` sets `BASE_SHA` and runs `node scripts/diff-budget.mjs`.
- The diff budget script supports an explicit escape hatch via `DIFF_BUDGET_OVERRIDE_REASON` and prints the reason when set (`scripts/diff-budget.mjs:257`, `scripts/diff-budget.mjs:384-388`).

**What’s missing vs task statement**
- No CI/PR-label-based override path exists in the workflow (no `label`/`labels` logic in `.github/workflows/core-lane.yml`).
- No mechanism to surface an override reason sourced from PR metadata (label text, PR body, etc.) in CI logs.

**Evidence**
- CI diff budget step: `.github/workflows/core-lane.yml:25-31`
- Override escape hatch + logging: `scripts/diff-budget.mjs:257`, `scripts/diff-budget.mjs:384-388`
- No label logic in workflows:
  ```bash
  rg -n "label|labels" .github/workflows || echo "(no label-based override logic in .github/workflows/)"
  ```
  Output:
  ```
  (no label-based override logic in .github/workflows/)
  ```

**Verification (manual runs)**
- Default failure when budget exceeded (no override):
  ```bash
  node scripts/diff-budget.mjs --commit HEAD --max-lines 0; echo "exit=$?"
  ```
  Output:
  ```
  ❌ Diff budget exceeded (commit=HEAD)
   - total lines changed 28 > 0
  Top changed files:
    - tasks/index.json: 16
    - tasks/tasks-0908-diff-budget-followups.md: 12

  To proceed, either split the change into smaller diffs or set an explicit justification:
    DIFF_BUDGET_OVERRIDE_REASON="why this diff must be large" node scripts/diff-budget.mjs
  exit=1
  ```
- Escape hatch works and surfaces reason in logs:
  ```bash
  DIFF_BUDGET_OVERRIDE_REASON="validation-only override" node scripts/diff-budget.mjs --commit HEAD --max-lines 0; echo "exit=$?"
  ```
  Output:
  ```
  ❌ Diff budget exceeded (commit=HEAD)
   - total lines changed 28 > 0
  Top changed files:
    - tasks/index.json: 16
    - tasks/tasks-0908-diff-budget-followups.md: 12

  Override accepted via DIFF_BUDGET_OVERRIDE_REASON: validation-only override
  exit=0
  ```

**Status:** 🟡 Partial (escape hatch exists, but no explicit CI override path like PR label + reason wiring)

**Recommended next steps (not implemented here)**
- Add CI wiring that conditionally sets `DIFF_BUDGET_OVERRIDE_REASON` based on an explicit override signal (e.g., PR label) and logs the reason.
- Ensure the default behavior remains a hard gate unless the explicit override signal is present.

### 2) Tests for `scripts/diff-budget.mjs`

**Checklist item:** `tasks/tasks-0908-diff-budget-followups.md:36-45`

**What exists**
- `scripts/diff-budget.mjs` implements:
  - Commit-scoped mode (`--commit`) (`scripts/diff-budget.mjs:25`, `scripts/diff-budget.mjs:66-70`)
  - Untracked file measurement with “too large” detection (`scripts/diff-budget.mjs:13`, `scripts/diff-budget.mjs:235-245`)
  - Ignore list/prefixes (`scripts/diff-budget.mjs:15-22`)
  - Override reason behavior (`scripts/diff-budget.mjs:257`, `scripts/diff-budget.mjs:384-399`)

**What’s missing vs task statement**
- No automated tests covering the above behaviors were found.

**Evidence**
- Repo search:
  ```bash
  rg -n "diff-budget" tests || echo "(no matches in tests/)"
  ```
  Output:
  ```
  (no matches in tests/)
  ```

**Verification (manual spot-checks)**
- Untracked-too-large behavior (manual repro with a temporary 1.1MB untracked file; cleaned up after):
  ```bash
  dd if=/dev/zero of=tmp-diff-budget-large.bin bs=1024 count=1100 status=none
  node scripts/diff-budget.mjs --dry-run
  rm -f tmp-diff-budget-large.bin
  ```
  Output (key lines):
  ```
  ❌ Diff budget exceeded (base=origin/main)
   - untracked files could not be measured: 1
  Untracked measurement issues:
    - tmp-diff-budget-large.bin: too large to measure (1126400 bytes)
  Dry run: exiting successfully despite failures.
  ```

**Status:** ❌ Not validated (tests are missing)

**Recommended next steps (not implemented here)**
- Add Vitest coverage for:
  - `--commit` mode vs working tree behavior
  - Untracked-too-large detection and exit code behavior
  - Ignore list handling (exact + prefixes)
  - Override reason behavior (logs + exit code)

### 3) README: diff-budget expectations + recommended `NOTES="..." npm run review`

**Checklist item:** `tasks/tasks-0908-diff-budget-followups.md:47-52`

**What exists**
- README documents `npm run review` and mentions `NOTES=<free text>` for the `prompts:review-handoff` flow (`README.md:106-107`, `README.md:149`).
- The repo’s conventions explicitly include diff budget + the recommended `NOTES="<goal + what changed + any risks>" npm run review` invocation (`.agent/system/conventions.md:18-19`).

**What’s missing vs task statement**
- No diff-budget expectations are documented in `README.md` (no mention of `node scripts/diff-budget.mjs` / `DIFF_BUDGET_OVERRIDE_REASON`).
- No explicit recommended `NOTES="<goal + summary + risks>" npm run review` invocation appears in `README.md`.

**Evidence**
- README has `npm run review` but no diff-budget content:
  ```bash
  rg -n "diff[- ]budget|diff-budget|DIFF_BUDGET" README.md || echo "(README.md: no diff-budget documentation found)"
  ```
  Output:
  ```
  (README.md: no diff-budget documentation found)
  ```
- README lacks the recommended NOTES invocation:
  ```bash
  rg -n "NOTES=\\\"<goal \\+" README.md || echo "(README.md: no recommended NOTES=\\\"<goal + ...\\\" invocation)"
  ```
  Output:
  ```
  (README.md: no recommended NOTES="<goal + ..." invocation)
  ```
- Recommended invocation exists in conventions (but not README): `.agent/system/conventions.md:18-19`

**Status:** 🟡 Partial (review command is documented, but diff-budget expectations + the specific recommended NOTES invocation are missing)

**Recommended next steps (not implemented here)**
- Update `README.md` to include:
  - The diff budget gate purpose + how it runs (CI + local)
  - How to use `DIFF_BUDGET_OVERRIDE_REASON` responsibly
  - The recommended `NOTES="<goal + summary + risks>" npm run review` invocation

## Repo Verification Runs (baseline)

These were executed locally on the repo state listed at the top of this document:

```bash
node scripts/spec-guard.mjs --dry-run
npm run build
npm run lint
npm run test
npm run docs:check
node scripts/diff-budget.mjs
```

Observed outputs (summaries):
- `node scripts/spec-guard.mjs --dry-run` → `✅ Spec guard: OK`
- `npm run build` → exit 0
- `npm run lint` → exit 0
- `npm run test` → `Test Files  53 passed (53)` / `Tests  212 passed (212)`
- `npm run docs:check` → `✅ docs:check: OK`
- `node scripts/diff-budget.mjs` → `✅ Diff budget: OK (base=origin/main, files=0/25, lines=0/800, +0/-0)`

## Assumptions / Notes

- CI override validation is based on repository configuration inspection (no GitHub Actions runtime simulation); current workflow contains no label-based override wiring.
- The follow-up tasks themselves remain unimplemented/unvalidated; this PR only adds planning collateral and mirrors for Task 0908 (see the “Planning Collateral” section above).
