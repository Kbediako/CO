# PRD - CO-592 Provider Parent-Proof Rehydration

## Immediate Traceability
- Linear issue: `CO-592` / `5404ace3-9fa9-4dce-b0b8-0196aa6a4ce1`
- Task id: `linear-5404ace3-9fa9-4dce-b0b8-0196aa6a4ce1`
- Canonical spec: `tasks/specs/linear-5404ace3-9fa9-4dce-b0b8-0196aa6a4ce1.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-5404ace3-9fa9-4dce-b0b8-0196aa6a4ce1.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-5404ace3-9fa9-4dce-b0b8-0196aa6a4ce1.md`
- Task checklist: `tasks/tasks-linear-5404ace3-9fa9-4dce-b0b8-0196aa6a4ce1.md`
- `.agent` mirror: `.agent/task/linear-5404ace3-9fa9-4dce-b0b8-0196aa6a4ce1.md`
- Source anchor: `ctx:sha256:82b6890ddb28df5fdb3ee033ffaeefd5d64ff61a39c34fe6c0fd1119ab0d1b87#chunk:c000001`
- Source object id: `sha256:82b6890ddb28df5fdb3ee033ffaeefd5d64ff61a39c34fe6c0fd1119ab0d1b87`
- Context dir pointer: `.runs/linear-5404ace3-9fa9-4dce-b0b8-0196aa6a4ce1-docs-packet/cli/2026-05-31T20-41-25-661Z-619c35c5/memory/source-0`
- Source payload pointer: `.runs/linear-5404ace3-9fa9-4dce-b0b8-0196aa6a4ce1-docs-packet/cli/2026-05-31T20-41-25-661Z-619c35c5/memory/source-0/source.txt`
- Origin manifest pointer: `.runs/linear-5404ace3-9fa9-4dce-b0b8-0196aa6a4ce1-docs-packet/cli/2026-05-31T20-41-25-661Z-619c35c5/manifest.json`
- Source payload availability note: the `.runs` payload path is absent in this child checkout, so this packet preserves the parent-provided source anchor and uses the child-lane prompt plus current read-only guard/source inspection as the issue-shaping contract. Parent owns live issue-context and source-payload reconciliation.

## Summary
- Problem Statement: `delegation-guard` requires `provider docs-review children` to prove a registered provider parent task and `sanctioned provider parent proof`. CO-461 and CO-557 made that strict on purpose, but a parent worker that has been safely rehydrated can leave `rehydrated active provider claims` as the live control-host truth while older launch provenance is cleared or unavailable. If guard only recognizes the original launch-provenance shape, legitimate provider docs-review children can fail even though the active parent run, provider-intake claim, issue identity, and `parent_run_id` all still agree.
- Desired Outcome: add a narrow parent-proof rehydration contract so `rehydrated active provider claims` can satisfy `sanctioned provider parent proof` only when they are current, same-issue, same-run, same-root, and backed by an active provider parent manifest. The fix must preserve CO-461 and CO-557 strictness: the guard must not accept `parent_run_id` alone, stale claims, foreign claims, released claims, or unrelated claims.

## User Request Translation
- User intent / needs: create and register the CO-592 docs-first packet explaining the provider parent-proof rehydration fix while preserving CO-461/CO-557 `delegation-guard` strictness. This child lane is docs-only and leaves parent implementation, validation, Linear state, workpad, PR lifecycle, and review handoff to the parent lane.
- Success criteria / acceptance:
  - packet uses provider issue task key `linear-5404ace3-9fa9-4dce-b0b8-0196aa6a4ce1` without issue-title, retry, or freshness suffixes.
  - packet preserves exact protected terms: `rehydrated active provider claims`, `sanctioned provider parent proof`, `provider docs-review children`, `delegation-guard`, `CO-461`, and `CO-557`.
  - packet explains that rehydrated active proof is valid only when provider-intake claim, active parent manifest, `parent_run_id`, task key, issue identity, and artifact root agree.
  - packet explicitly rejects accepting `parent_run_id` alone, stale claims, foreign claims, released claims, or unrelated claims.
  - `tasks/index.json` registers the TECH_SPEC under the provider issue task key.
- Constraints / non-goals:
  - this child lane edits only the declared docs/task packet and registry files.
  - no source code, tests, Linear mutation helpers, GitHub, PR lifecycle, workpad mutation, commits, or full repo validation from this child lane.
  - no weakening of `delegation-guard`, CO-461 provider docs-review child identity checks, or CO-557 task-key/root checks.
  - no manual `provider-intake-state.json` surgery and no audit-history deletion.

## Intent Checksum
- Exact user wording / phrases to preserve:
  - `rehydrated active provider claims`
  - `sanctioned provider parent proof`
  - `provider docs-review children`
  - `delegation-guard`
  - `CO-461`
  - `CO-557`
  - `parent_run_id alone`
  - `stale`
  - `foreign`
  - `released`
  - `unrelated claims`
- Protected artifact and surface names:
  - `node scripts/delegation-guard.mjs`
  - `tests/delegation-guard.spec.ts`
  - `orchestrator/src/cli/control/providerIssueHandoff.ts`
  - `provider-intake-state.json`
  - `manifest.json`
  - `parent_run_id`
  - `provider_issue_rehydrated_active_run`
  - `linear child-stream --pipeline docs-review`
  - `linear-<issue-id>-docs-review`
  - `tasks/index.json`
  - `shared control-host artifact root`
  - `workspace-local .runs`
- Nearby wrong interpretations to reject:
  - accepting a provider docs-review child because `parent_run_id` matches any run id.
  - treating issue id, issue identifier, or provider-looking task id shape as sufficient proof.
  - using stale or foreign `provider-intake-state.json` from another workspace/root.
  - treating `released`, terminal, completed, or retained audit rows as active parent proof.
  - broadening CO-461 into arbitrary unregistered child-task acceptance.
  - undoing CO-557 root authority by letting manifest `workspace_path` select a foreign proof source.
  - solving the issue with `DELEGATION_GUARD_OVERRIDE_REASON`.

## Parent-Proof Rehydration Matrix

| Surface | Current truth | Reference truth | Target truth / intended delta | Explicitly out-of-scope differences |
| --- | --- | --- | --- | --- |
| Rehydrated active provider claim | Rehydration can leave `state=running` and `reason=provider_issue_rehydrated_active_run` as live provider-intake truth for an active parent run. | Active provider claims are audit evidence only when tied to same issue, run, manifest, and current root. | `delegation-guard` may treat `rehydrated active provider claims` as `sanctioned provider parent proof` only when all identity and root checks match. | Accepting rehydrated rows without an active parent manifest. |
| Provider docs-review child lineage | Child manifests carry `parent_run_id`, but CO-461 proved that lineage alone is not enough. | `provider docs-review children` require registered parent task identity plus sanctioned provider parent proof. | Child `parent_run_id` must match the rehydrated active parent claim/run and the child issue fields must match the sanctioned parent when present. | `parent_run_id alone` acceptance. |
| CO-461 strictness | CO-461 requires provider docs-review child task identity to fail closed on missing/mismatched provenance, registered-parent-prefix mismatch, and ordinary unregistered top-level task ids. | Strict `delegation-guard` behavior is a correctness contract. | Rehydrated proof is an additional sanctioned proof source, not a task-registration bypass. | Blanket guard overrides or arbitrary `linear-<issue-id>-docs-review` acceptance. |
| CO-557 root authority | CO-557 rejects sibling task-key drift and foreign/root-drift proof lookup. | Current workspace/shared control-host root authority must outrank stale manifest workspace paths. | Rehydrated proof lookup must remain current-root/shared-root bounded and reject foreign provider-intake state. | Restoring foreign manifest `workspace_path` authority. |
| Released or stale audit rows | Retained `released` rows and stale parent runs preserve history but are not live parent authority. | Provider audit history should remain visible without authorizing new child work. | `released`, terminal, stale, mismatched, or unrelated claims fail closed as parent proof. | Deleting or rewriting audit rows to make guard pass. |

## Not Done If
- `delegation-guard` accepts `parent_run_id` alone.
- `delegation-guard` accepts stale, foreign, released, terminal, completed, retained, or unrelated claims as `sanctioned provider parent proof`.
- `provider docs-review children` can pass without a registered parent task key in `tasks/index.json`.
- `provider docs-review children` can pass when child issue fields conflict with the sanctioned parent issue.
- Rehydrated parent proof can be read from a foreign workspace/root or stale manifest `workspace_path`.
- The implementation weakens CO-461 missing-provenance, mismatched-provenance, registered-prefix, or ordinary-top-level rejection coverage.
- The implementation weakens CO-557 docs-review task-key or control-host root authority.
- The fix mutates `provider-intake-state.json` manually, deletes audit history, or relies on permanent `DELEGATION_GUARD_OVERRIDE_REASON`.
- This child lane edits source, tests, Linear, GitHub, PR lifecycle, workpad state, commits, or files outside declared scope.

## Goals
- Create the CO-592 docs-first packet and registry/checklist mirrors.
- Define the narrow rehydrated active provider parent-proof contract.
- Preserve CO-461 and CO-557 as reference strictness contracts.
- Require parent implementation to fail closed on parent-run-only, stale, foreign, released, or unrelated proof.
- Keep provider-intake history auditable while allowing current rehydrated active parent claims to support governed docs-review.

## Non-Goals
- No source or test edits in this child lane.
- No Linear mutation helpers, issue-context transitions, workpad edits, GitHub, PR lifecycle, review-handoff commands, or commits.
- No full repo validation from this child lane.
- No manual `provider-intake-state.json` repair.
- No blanket `delegation-guard` override or unregistered task-key acceptance.
- No rewrite of provider-worker launch, docs-review content, CO-461, or CO-557 beyond the narrow parent-proof rehydration contract.

## Metrics & Guardrails
- Primary success: focused parent-owned tests prove a current `provider_issue_rehydrated_active_run` claim can authorize the matching provider docs-review child while stale, foreign, released, unrelated, and parent-run-only shapes fail closed.
- Guardrail: CO-461/CO-557 strictness remains visible in diagnostics and tests.
- Guardrail: task registration and root authority remain canonical through `tasks/index.json` plus current workspace/shared control-host root evidence.

## Technical Considerations
- `scripts/delegation-guard.mjs` currently derives provider parent proof from `provider-intake-state.json`, active manifests, registered task keys, `parent_run_id`, issue identity, and artifact root resolution.
- `orchestrator/src/cli/control/providerIssueHandoff.ts` can persist `provider_issue_rehydrated_active_run` rows during active-run rehydration and may clear original launch provenance when the active manifest provenance cannot be safely preserved.
- Parent implementation should prefer a minimal guard-side proof extension: when launch provenance is unavailable because the active run was rehydrated, require stronger same-run, same-manifest, same-issue, same-task, same-root, and active-parent-manifest proof.
- Parent implementation should keep existing launch-provenance proof as-is when available and matched.

## Fallback / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? `Yes`.
- Large refactor: not selected for the docs packet. Start with a scoped `delegation-guard`/provider-intake proof fix. Relaunch with widened ownership only if parent source inspection proves active rehydration proof cannot be made explicit at the existing guard/provider-intake seam.
- Minor seam: acceptable only as the expiring rehydrated-proof compatibility below; no retained loose parent proof is approved.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Rehydrated provider parent proof | `rehydrated active provider claims` may be ignored as parent proof when original control-host launch provenance was safely cleared during active-run rehydration. | expire fallback | CO-592 parent implementation | `provider docs-review children` run after parent provider-worker rehydration. | 2026-05-31 | 2026-05-31 | 30 days, expires 2026-06-30 | `delegation-guard` recognizes current same-issue, same-run, same-manifest, same-root rehydrated active parent proof without requiring a loose override. | Focused passing rehydrated active parent-proof regression plus existing CO-461/CO-557 guard matrix. |
| Strict provider child authorization | Contract name: `sanctioned provider parent proof` for `provider docs-review children`. | justify retaining fallback | `delegation-guard` / provider child-stream contract | Provider docs-review child validation. | CO-461 / CO-557 | 2026-05-31 | Non-expiring durable retention only with rationale | Non-expiring rationale: rejecting `parent_run_id alone`, stale, foreign, released, and unrelated proof is correctness behavior, not temporary fallback behavior. | Negative regressions for parent-run-only, stale, foreign, released, unrelated, issue mismatch, missing parent_run_id, and unregistered top-level task ids. |
| Provider intake audit residue | Retained/stale provider-intake rows can remain visible beside live rehydrated active rows. | justify retaining fallback | provider-intake audit history | Guard scans provider-intake state for parent proof. | Existing provider-intake behavior | 2026-05-31 | Non-expiring durable audit retention | Audit rows stay visible but are excluded from sanctioned parent proof unless they satisfy active same-run proof requirements. | Released/stale/foreign/unrelated rows fail closed while audit data remains unchanged. |

Durable retention evidence:
- Contract name: strict rehydrated parent-proof authorization.
- Owning surface: `delegation-guard` and provider-intake parent proof lookup.
- Steady-state proof: `parent_run_id alone`, stale, foreign, released, unrelated, issue-mismatched, and ordinary unregistered top-level task ids fail closed.
- Tests/docs: `tests/delegation-guard.spec.ts`, CO-461 packet, CO-557 packet, and this CO-592 packet.
- Non-expiring rationale: strict provider parent proof is a correctness contract and should outlive this issue.
