# ACTION_PLAN - CO-546 attach live Linear state to rehydrated pending-claim revalidation

## Traceability
- Linear issue: `CO-546` / `29b67d32-a612-489f-a1ac-8fd9cc4a9b5d`
- PRD: `docs/PRD-linear-29b67d32-a612-489f-a1ac-8fd9cc4a9b5d.md`
- TECH_SPEC: `tasks/specs/linear-29b67d32-a612-489f-a1ac-8fd9cc4a9b5d.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-29b67d32-a612-489f-a1ac-8fd9cc4a9b5d.md`
- Checklist: `tasks/tasks-linear-29b67d32-a612-489f-a1ac-8fd9cc4a9b5d.md`

## Current Evidence
- CO-544 merged, then live control-host validation still showed CO-510 and CO-512 active provider-intake accepted claims with `reason=provider_issue_rehydration_pending_revalidation`, stale cached `issue_state=In Progress`, and `live_linear_state=null`.
- Fresh issue-context reads showed CO-510 and CO-512 are `Blocked`.
- Source inspection shows accepted claims without queued retry are rewritten as accepted pending-revalidation in `rehydrateNow` without calling the fresh tracked issue resolver.

## Plan
1. Register this docs-first packet across task mirrors and freshness registry.
2. Add focused `ProviderIssueHandoff` regression coverage for accepted pending-revalidation cached `In Progress` plus live `Blocked`.
3. Implement a narrow rehydrate helper that applies fresh tracked issue release fields before preserving accepted/running/resumable pending-revalidation claims.
4. Preserve fail-closed pending state when live issue lookup is unavailable or skipped.
5. Run focused validation and update the Linear workpad with evidence.
6. Prepare PR/review handoff if validation is clean; manually trigger Codex review if automatic review does not start.

## Validation
- `git diff --check`
- `node -e "JSON.parse(require('node:fs').readFileSync('tasks/index.json','utf8')); JSON.parse(require('node:fs').readFileSync('docs/docs-freshness-registry.json','utf8'))"`
- Focused `ProviderIssueHandoff` tests covering CO-546.
- `node scripts/spec-guard.mjs --dry-run`
- Build/lint/docs gates scaled to touched surfaces before PR handoff.

## Risks
- Releasing without live evidence would fail open; tests must prove unavailable evidence preserves pending revalidation.
- Duplicating eligibility logic could drift from CO-544; reuse existing live issue refresh/release helpers.
- Broad status-monitor changes could absorb CO-542; keep this lane limited to CO-546 claim revalidation.
