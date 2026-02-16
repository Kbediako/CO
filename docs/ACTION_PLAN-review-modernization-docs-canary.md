# ACTION_PLAN - Review Modernization + Docs Discoverability + RLM Canary (0966)

## Phase 1 - Docs-first scaffold
1. Add task files + mirrors.
2. Register the task in `tasks/index.json` and `docs/TASKS.md`.
3. Update `docs/docs-freshness-registry.json` for any new docs.
4. Capture a docs-review manifest (`docs-review` pipeline).

## Phase 2 - Review wrapper modernization
1. Update `scripts/run-review.ts`:
   - Prefer passing `--uncommitted/--base/--commit` to `codex review` when supported.
   - Persist prompt/output artifacts under the active run directory.
   - Keep CI-safe handoff mode.
2. Update docs to match the new behavior (`docs/standalone-review-guide.md` at minimum).

## Phase 3 - Docs discoverability
1. Add short “Notes/Docs” pointers in CLI help and README to the RLM + cloud guides.

## Phase 4 - Canary
1. Add (or confirm) a small RLM recursion canary test for pointer reads + `final_var` resolution.

## Phase 5 - Validation + ship
1. Run the full guardrail chain via `implementation-gate` and capture the manifest.
2. Open PR; monitor checks + bots; auto-merge when green.
3. Cut a patch release (`0.1.28`) and update global install.

