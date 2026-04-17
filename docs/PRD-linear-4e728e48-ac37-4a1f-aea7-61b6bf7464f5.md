# PRD - CO appserver child lanes stall after runtime selection and leave the parent blocked on a synthetic launching reservation

## Added by Bounded Docs Child Lane 2026-04-18

## Traceability
- Linear issue: `CO-224` / `4e728e48-ac37-4a1f-aea7-61b6bf7464f5`
- Packet prefix: `linear-4e728e48-ac37-4a1f-aea7-61b6bf7464f5`
- Task id: `20260418-linear-4e728e48-ac37-4a1f-aea7-61b6bf7464f5`
- Source anchor: `ctx:sha256:b7611a224cd777bffc38c866661c0a8d2cdaf4f31619cac8fd78150f5b46cbea#chunk:c000001`
- Parent-provided source payload reference: `.runs/linear-4e728e48-ac37-4a1f-aea7-61b6bf7464f5-docs-packet/cli/2026-04-17T18-52-06-926Z-75ac64a4/memory/source-0/source.txt`
- Shared source-0 availability note: the referenced payload was not materialized inside this bounded child checkout; this packet relies on the exact issue statement carried in the lane prompt together with current repo seams.
- Docs packet child lane manifest: `.runs/linear-4e728e48-ac37-4a1f-aea7-61b6bf7464f5-docs-packet/cli/2026-04-17T18-52-06-926Z-75ac64a4/manifest.json`
- Traceability note: do not refer to the packet prefix itself as the task id; the canonical task id is the date-prefixed form above.

## Summary
- Problem Statement: `provider-linear-child-lane` can reserve a child lane for the parent and then resolve runtime mode to `appserver`, but the child run can stall after runtime selection and before a real child-run startup record, proof artifact, or usable decision target exists. In that shape, the parent remains blocked on the synthetic launching reservation instead of moving to a truthful stalled-startup classification or bounded recovery path.
- Desired Outcome: add a bounded startup-stall contract so parent-owned child-lane flow can distinguish "reserved and still legitimately starting" from "runtime selected but startup never progressed." The recovery must preserve the truthful absence of child proof, stay fail-closed on lineage and scope, and remain separate from both `CO-210` started-manifest hydration and `CO-218` post-startup stale-reservation repair.

## User Request Translation
- Create the docs-first packet and required task mirrors for `CO-224` only.
- Preserve the exact issue statement: appserver child lanes can stall after runtime selection and leave the parent blocked on a synthetic launching reservation.
- Treat this as the pre-startup/appserver-stall sibling to `CO-218`, not as a `CO-210` current-progress hydration issue and not as a `CO-211` refresh-stuck restart-churn issue.
- Keep parent-owned child-lane authority, provenance, and patch acceptance fail-closed. The startup-stall path must not fabricate a real child run, fake a child proof, or auto-accept anything.
- Keep implementation, source/test inspection, Linear/workpad changes, PR lifecycle, and validation with the parent lane.

## Intent Checksum
- Protected terms and surfaces:
  - `provider-linear-child-lane`
  - `Child lane reserved before child run startup.`
  - synthetic launching reservation
  - runtime selection
  - `appserver`
  - `provider-linear-child-lane-proof.json`
  - `provider-linear-worker-child-lanes.json`
  - `providerLinearChildLaneRunner`
  - `providerLinearChildLaneShell`
  - `CO-210`
  - `CO-211`
  - `CO-218`
- Nearby wrong interpretations to reject:
  - this is only a `CO-210` status/progress hydration problem after a started child manifest already exists
  - this is only a `CO-218` stale pending-ledger repair after stronger same-lineage manifest/proof recovery already exists
  - this is only `CO-211` refresh-stuck restart churn with healthy active workers
  - the fix can succeed by hiding the launching reservation string without classifying the pre-startup stall
  - the fix can synthesize child proof or treat missing startup proof as an accepted child lane
  - the fix requires broad runtime-mode redesign, scheduler redesign, or child-lane authority expansion

## Parity / Alignment Matrix

| Surface | Current / Reference Truth | Target Truth |
| --- | --- | --- |
| Child-lane launch reservation | Parent records a synthetic launching reservation with summary `Child lane reserved before child run startup.` before the child run actually starts. | Reservation remains truthful for genuine startup, but no longer blocks the parent indefinitely when startup stalls after runtime selection. |
| Runtime selection | `providerLinearChildLaneRunner` can resolve and log `appserver` runtime selection before invoking the child `codex exec` call. | Runtime selection is preserved, but the system can classify when progress never advances beyond that stage. |
| Child proof / startup evidence | In the stalled shape, there is no usable started child run or proof that should be treated like a real recovered lane. | Absence of proof remains explicit and truthful; recovery cannot fabricate started-lane evidence. |
| Parent decision / recovery target | Parent stays pinned on a synthetic launching reservation even though the child has stopped making forward startup progress. | Parent can transition to a bounded, fail-closed startup-stall outcome or recovery path without pretending the child actually started. |
| Adjacent issue boundaries | `CO-210` owns started-manifest hydration, `CO-218` owns post-startup stale reservation repair, and `CO-211` owns refresh-stuck restart churn. | `CO-224` remains the distinct pre-startup/appserver-stall boundary between those issues. |

## Acceptance Criteria
1. The packet preserves `CO-224` as the pre-startup/appserver-stall sibling to `CO-218`: runtime selection has happened, but there is still no real started child-run proof or decision target.
2. Parent implementation is required to distinguish a genuine launching window from a stall that occurs after runtime selection and before usable child startup evidence exists.
3. Parent implementation is required to keep the absence of child proof truthful: no fabricated manifest recovery, no fake proof, and no auto-acceptance of the stalled child lane.
4. Parent implementation is required to avoid indefinite parent blockage on a synthetic launching reservation when the child lane has stalled past the real startup boundary.
5. The lane preserves adjacent issue boundaries:
   - `CO-210` current-progress hydration remains unchanged.
   - `CO-211` refresh-stuck restart churn remains unchanged.
   - `CO-218` post-startup stale launching repair remains unchanged.
6. The packet and mirrors explicitly preserve parent-owned implementation, validation, Linear/workpad reconciliation, PR, and merge lifecycle.

## Non-Goals
- No runtime code, test, workpad, Linear, or PR mutations from this child lane.
- No `CO-210` current-progress hydration rewrite.
- No `CO-218` recovered-manifest/proof reconciliation rewrite.
- No `CO-211` control-host refresh restart-churn rewrite.
- No broad runtime-mode redesign or appserver migration policy change.
- No scheduler/admission/cap redesign for child lanes.
- No fabricated child proof, fake startup success, or auto-accept behavior.

## Not Done If
- The issue is reframed as only `CO-210`, only `CO-211`, or only `CO-218`.
- Parent can still remain indefinitely blocked on a synthetic launching reservation after a child lane stalls beyond runtime selection and never produces real startup proof.
- The proposed recovery path fabricates child manifest/proof evidence or treats a stalled pre-startup child as a real started lane.
- The lane broadens into runtime-mode redesign, scheduler redesign, or general appserver policy migration.
- The packet omits the exact boundaries against `CO-210`, `CO-211`, and `CO-218`.

## Guardrails
- Parent lane owns source/test inspection, implementation, validation, Linear/workpad reconciliation, PR lifecycle, and final disposition.
- Startup-stall handling must preserve truthful absence of child proof and remain fail-closed on scope, lineage, and patch acceptance.
- Keep the change local to the child-lane startup/reservation seam; do not widen into unrelated provider runtime or refresh-control policies.

## User Experience
- Operators should not be left guessing whether a child lane is still genuinely starting or has stalled after runtime selection.
- Parent-owned recovery should expose a truthful stalled-startup outcome instead of leaving the issue pinned behind a synthetic launching reservation.
- Reviewers should be able to audit that no child-run proof was fabricated and that adjacent issue boundaries stayed intact.
