# Task Checklist - linear-da290822-55a2-4794-8caa-3a6f1d9c3eff
## Docs-first
- [x] PRD, TECH_SPEC, ACTION_PLAN, `tasks/index.json`, and `docs/TASKS.md` updated for `CO-23`.
- [x] Docs-review evidence recorded for the CO-23 task packet; manifest: `.runs/linear-da290822-55a2-4794-8caa-3a6f1d9c3eff-docs-review/cli/2026-03-27T07-59-26-687Z-b3902cf6/manifest.json`; delegated guard stages passed, and the forced review stage drifted, so the override is recorded at `out/linear-da290822-55a2-4794-8caa-3a6f1d9c3eff/manual/20260327T080637Z-docs-first/05-docs-review-override.md`.
## Implementation
- [x] Branch resynced onto current `origin/main`, which already contains the CO-8 runtime-proof helper baseline from PR `#308`.
- [x] Add the explicit opt-in DNS-aware reachability mode while preserving the deterministic default path.
- [x] Update help, worker guidance, docs, and focused regressions for the clarified contract.
## Validation
- [x] `delegation-guard`, `spec-guard --dry-run`, `build`, `lint`, `test`, `docs:check`, `docs:freshness`, `diff-budget`, wrapper-led `review` (manual changed-area + elegance fallback after the manifest-backed run stalled without a concrete verdict), and `pack:smoke`
- [ ] Address current PR feedback, rerun touched-surface validation, and regain a clean `pr ready-review` quiet window.
## Progress Log
- [x] Baseline audit captured the current-main gap versus the local CO-8 runtime-proof branch. Evidence: `out/linear-da290822-55a2-4794-8caa-3a6f1d9c3eff/manual/20260327T075424Z-baseline-audit.md`.
- [x] Live Linear team state was inspected, the issue was moved from `Ready` to `In Progress`, and the single active workpad comment was created. Evidence: Linear transition result plus workpad comment `983ae999-2d2f-4acb-9b60-ee6a708d5edc`.
- [x] Branch merged `origin/main` through `4199d12b7`, confirming the CO-8 runtime-proof baseline is already upstream and narrowing CO-23 to the reviewer-reachability contract delta.
- [x] DNS-aware runtime-proof contract landed on PR `#310`, keeping the deterministic default while adding explicit opt-in `dns-public` worker-local reachability evidence.
- [ ] Pending: address CodeRabbit feedback, refresh touched-surface validation, and hand off once PR checks plus ready-review return clean.
