# 1128 Docs-First Summary

- Registered `1128` as the next bounded review-reliability lane after `1127`.
- Scope is the missing first-class `architecture` review surface in standalone review, plus the remaining default diff startup-anchor looseness around `git show <rev>:<path>`.
- The target contract is explicit and additive:
  - keep `diff` as the default bounded touched-path review,
  - keep `audit` evidence-focused,
  - add `architecture` for broader design/context review using the canonical docs-first inputs,
  - allow only the narrow wrapper/docs support surfaces needed for architecture review.
- Explicitly out of scope:
  - native review replacement,
  - reopening `1098` or `1099`,
  - broad heuristic retuning unrelated to the new surface contract,
  - introducing a third startup-anchor mode in this slice.
- `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`, the task mirrors, and the deliberation note were updated for the registered lane.
- Local `spec-guard`, `docs:check`, and `docs:freshness` all passed on the registered package.
- The first docs-review attempt failed only because the lane did not yet have a `.runs/<task>-*` scout manifest for the delegation guard.
- A bounded scout manifest was created at `.runs/1128-coordinator-symphony-aligned-standalone-review-architecture-surface-boundary-scout/cli/2026-03-12T03-21-38-462Z-4e49eed1/manifest.json`.
- After the scout existed, docs-review succeeded once on the near-final tree and then again on the final synced registration tree at `.runs/1128-coordinator-symphony-aligned-standalone-review-architecture-surface-boundary/cli/2026-03-12T03-31-32-510Z-bb0e3ced/manifest.json`.
- During registration, `docs/TASKS.md` briefly exceeded the archive threshold because a legacy multiline `0962` block was still present; the block was compacted into the current one-line snapshot form so the file returned below the policy cap.
