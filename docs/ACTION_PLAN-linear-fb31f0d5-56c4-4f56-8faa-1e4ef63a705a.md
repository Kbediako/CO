# ACTION_PLAN - CO-394 expire provider workflow fallback mappings

## Summary
- Goal: apply CO-382 `fallback expiry` and `large refactor` policy to provider workflow fallback mappings in `providerIssueHandoff.ts`.
- Scope: docs-first packet, provider workflow fallback expiry metadata, focused tests, docs gates, review/elegance handoff.
- Non-goal: no broad provider workflow redesign or admission-safety weakening.

## Issue Readiness Gate
- Intent checksum: preserve `provider workflow`, `fallback expiry`, `large refactor`, `minor seam`, `remove fallback`, `expire fallback`, and `justify retaining fallback`.
- Protected surfaces: provider-id mapping fallback, retained-claim/autopilot fallback, provider issue current-state authority.
- Not done if: provider workflow retains indefinite fallback branches without owner/removal metadata, or validation misses activation/non-activation paths.
- Pre-implementation issue-quality review: CO-394 is not a generic cleanup lane; it touches high-churn provider workflow authority and must keep the micro-task path unavailable.

## Steps
1. Create docs-first packet and registry mirrors for CO-394.
2. Inventory provider-id mapping and retained-claim/autopilot fallback paths in `providerIssueHandoff.ts`.
3. Create the larger current-state authority follow-up (`CO-400`) instead of expanding CO-394 into the large refactor.
4. Add provider workflow fallback expiry metadata with owner, trigger, introduced date, review date, maximum lifetime, removal condition, and validation.
5. Add a focused metadata regression and run the existing ProviderIssueHandoff behavior coverage for activation/non-activation paths.
6. Run docs-review or relevant docs gates, focused tests, and full required validation as risk dictates.
7. Run standalone review, apply findings, run explicit elegance/minimality pass, update workpad, attach PR, and move to review only after checks/drain are clean.

## Fallback / Refactor Decision

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `provider workflow` | provider-id mapping fallback | `expire fallback` | `CO-400` | provider issue start/retry derives task identity from provider issue id | 2026-03-19 | 2026-05-10 | 2026-05-26 | provider issue task identity is renamed as supported or replaced by a canonical mapping source | metadata regression plus existing provider start activation tests |
| `provider workflow` | retained-claim/autopilot fallback | `expire fallback` | `CO-400` | cached claim state, retained run identity/proof, or autopilot/refetch fallback arbitrates current issue state | 2026-03-20 | 2026-05-10 | 2026-05-26 | one provider issue current-state authority order replaces cached/synthetic arbitration | metadata regression plus existing retained-claim activation and non-activation tests |

Large-refactor check: CO-382 prefers a larger consolidation because current-state authority is split across live Linear state, cached provider-intake state, retained run proof, and autopilot snapshots. CO-394 records expiry metadata and delegates that consolidation to `CO-400`.

## Validation
- `node -e "JSON.parse(require('fs').readFileSync('tasks/index.json','utf8')); JSON.parse(require('fs').readFileSync('docs/docs-freshness-registry.json','utf8'))"`
- `node scripts/spec-guard.mjs --dry-run`
- focused provider workflow test command covering the new metadata regression and existing retained-claim behavior paths
- `npm run docs:check`
- `npm run docs:freshness`
- standalone review and elegance pass before handoff

## Rollback
- Revert the CO-394 docs packet, expiry metadata, and focused tests.
- Keep `CO-400` as related backlog evidence if the parent issue still needs current-state authority consolidation.
