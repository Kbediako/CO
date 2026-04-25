# PRD - CO-305 keep parent issue evidence truthful across cross-issue `issue-context` reads

## Added by Docs Child Lane 2026-04-22

## Traceability
- Linear issue: `CO-305` / `6ef38dcf-eee6-4e2a-a261-179a040b52f3`
- Task id: `linear-6ef38dcf-eee6-4e2a-a261-179a040b52f3`
- Canonical spec: `tasks/specs/linear-6ef38dcf-eee6-4e2a-a261-179a040b52f3.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-6ef38dcf-eee6-4e2a-a261-179a040b52f3.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-6ef38dcf-eee6-4e2a-a261-179a040b52f3.md`
- Shared source 0 anchor: `ctx:sha256:d84141c3995ad070cf0b28b86f770ef757bfb3ee5240072fc996b2b78fa4abff#chunk:c000001`
- Source object id: `sha256:d84141c3995ad070cf0b28b86f770ef757bfb3ee5240072fc996b2b78fa4abff`
- Provided context dir: `.runs/linear-6ef38dcf-eee6-4e2a-a261-179a040b52f3-docs-packet/cli/2026-04-22T08-59-19-453Z-a315ce06/memory/source-0`
- Provided source payload pointer: `.runs/linear-6ef38dcf-eee6-4e2a-a261-179a040b52f3-docs-packet/cli/2026-04-22T08-59-19-453Z-a315ce06/memory/source-0/source.txt`
- Provided origin manifest pointer: `.runs/linear-6ef38dcf-eee6-4e2a-a261-179a040b52f3-docs-packet/cli/2026-04-22T08-59-19-453Z-a315ce06/manifest.json`
- Workspace-local provenance anchor: `ctx:sha256:ab4c3060e772d502014ab440b9e34d0ee916242ea9a6e6b3656566dfc21366f1#chunk:c000001`
- Source payload note: the provided source pointers are metadata/provenance only for this child lane. The substantive issue body contract below is preserved from the parent-owned live `linear issue-context` read and workpad, because this checkout does not carry the referenced `.runs/.../memory/source-0/source.txt` payload.

## Summary
- Problem Statement: the run-scoped singleton `provider-linear-issue-context-cache.json` is currently treated as a run-scoped artifact, but later cross-issue reads inside one provider-worker run can overwrite it. That makes the apparent parent-authoritative cache path untruthful for the original issue, which means parent issue evidence can drift and downstream consumers that treat the cache artifact as authoritative can either lose the original cached payload or cite the wrong issue body.
- Desired Outcome: key issue-context cache artifacts by issue id so parent issue evidence remains truthful across cross-issue reads, give runtime and docs consumers deterministic issue-specific selection, cover the reproduced `CO-301` multi-issue read shape with focused regression coverage, and update docs-first packet traceability so it no longer points at an ambiguous singleton path.

## User Request Translation (Context Anchor)
- User intent / needs: create the `CO-305` docs-first packet only, keeping scope strictly on issue-context cache persistence truth and the downstream surfaces that treat the cache artifact as authoritative.
- Success criteria / acceptance:
  - the six packet files exist for `linear-6ef38dcf-eee6-4e2a-a261-179a040b52f3`
  - the packet preserves the exact overwrite problem around `provider-linear-issue-context-cache.json`, `issue-context`, run-scoped artifact truth, cross-issue reads, and parent issue evidence
  - the parent implementation framing stays narrow: issue-keyed cache persistence, deterministic issue-specific selection, focused `CO-301` regression coverage, and issue-specific traceability updates
  - the packet rejects docs-only mitigation that leaves overwrite behavior intact
- Constraints / non-goals:
  - child lane owns only the six declared packet files
  - parent owns shared registries, runtime code, tests, workpad, Linear state, PR lifecycle, and patch integration
  - do not widen into generic Linear truth, PR attachment ownership, stale-blocker reconcile redesign, or a broad rewrite of provider-worker issue-context reading

## Intent Checksum
- Exact user wording / phrases to preserve:
  - `provider-linear-issue-context-cache.json`
  - `issue-context`
  - `run-scoped artifact`
  - `cross-issue reads`
  - `CO-301`
  - `CO-295`
  - `CO-299`
  - `CO-302`
  - `parent issue evidence`
  - `docs-first packet`
- Protected terms / exact artifact and surface names:
  - `provider-linear-issue-context-cache.json`
  - `issue-context`
  - `run-scoped artifact`
  - `cross-issue reads`
  - `parent issue evidence`
  - `CO-301`
  - `CO-295`
  - `CO-299`
  - `CO-302`
  - `orchestrator/src/cli/control/providerLinearWorkflowFacade.ts`
  - `resolveIssueContextCachePath(...)`
  - `readCachedIssueContextRecord(...)`
  - `writeCachedIssueContextRecord(...)`
  - `getProviderLinearIssueContext(...)`
  - `orchestrator/src/cli/control/providerMergeCloseout.ts`
- Nearby wrong interpretations to reject:
  - generic Linear truth or history redesign
  - PR attachment ownership or merge-closeout selection redesign
  - stale-blocker reconcile redesign
  - broad rewrite of provider-worker issue-context reading
  - docs-only mitigation that leaves the overwrite behavior intact
  - traceability wording changes without runtime cache truth repair

## Parity / Alignment Matrix
| Surface | Current Truth | Reference Truth | Target Truth | Explicitly Out Of Scope |
| --- | --- | --- | --- | --- |
| Cache artifact path | one run-scoped singleton `provider-linear-issue-context-cache.json` path can be rewritten by later cross-issue reads in the same run | parent issue evidence must remain bound to the issue that produced it | cache artifacts are keyed by issue id, so later cross-issue reads cannot overwrite another issue's authoritative payload | generic run-artifact redesign |
| Runtime cache fallback | `getProviderLinearIssueContext(...)` and same-run cache consumers only have one apparent cache slot for the run | cache fallback must be deterministic for the requested issue | readers resolve or select the issue-specific cached payload for the requested issue | broad issue-context reader rewrite |
| Merge-closeout seam | deterministic merge closeout already depends on same-run cached issue-context truth in bounded cases | fallback consumers must never lose parent issue truth because another issue was read later | `providerMergeCloseout.ts` and related fallback helpers consume issue-specific cache truth | PR attachment correctness redesign |
| Docs-first packet evidence | task packets and mirrors can cite one ambiguous singleton path as if it were parent-authoritative issue-body evidence | docs packet evidence should point to truthful issue-specific artifacts | traceability guidance points to issue-specific evidence instead of one ambiguous parent path | docs-only patch that leaves runtime overwrite intact |
| Regression framing | the reproduced multi-issue overwrite shape can regress silently | the known `CO-301` multi-issue shape must stay covered | focused regression proves later cross-issue reads do not overwrite parent issue evidence | generic multi-issue Linear workflow redesign |

## Acceptance Criteria
- A later cross-issue `issue-context` read in the same provider-worker run can no longer overwrite the authoritative cached payload for the parent issue.
- Runtime consumers that need cached issue-context truth resolve the issue-specific payload deterministically rather than inferring truth from one ambiguous singleton path.
- Docs-first packet and checklist traceability no longer cite a singleton cache path as parent issue evidence when that path can later contain a different issue body.
- Focused regression coverage reproduces the `CO-301` multi-issue read shape and proves that parent issue evidence remains stable after later cross-issue reads.
- The implementation stays bounded to issue-context cache persistence truth and authoritative downstream consumers.

## Non-Goals
- No generic Linear truth redesign.
- No unrelated PR attachment ownership or reconciliation work.
- No stale-blocker reconcile redesign.
- No broad rewrite of provider-worker issue-context reading.
- No weakening of docs-first traceability or machine-checkable provenance.
- No docs-only mitigation that leaves overwrite behavior intact.

## Not Done If
- A later cross-issue read can still overwrite the same apparent parent-authoritative path.
- Downstream docs/task packets can still cite a parent cache path that now contains a different issue body.
- Runtime readers still depend on one ambiguous singleton cache artifact for authoritative issue-specific truth.
- The repair widens into generic Linear truth, PR attachment ownership, stale-blocker reconcile redesign, or other unrelated runtime changes.

## Validation Contract
- Child lane checks only the six packet files for protected-term coverage and whitespace cleanliness.
- Parent adds focused regression coverage for the `CO-301` multi-issue read shape in the cache write/read seam and any bounded same-run cache consumer that depends on authoritative issue-specific selection.
- Parent updates run-artifact and docs traceability guidance to point at issue-specific evidence instead of the ambiguous singleton path.
- Parent owns implementation, focused tests, docs-review, broader validation, workpad updates, and PR lifecycle.
