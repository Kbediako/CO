# PRD - Control host: reconcile released-claim run metadata, operator advisories, and advisory-state truth after issue release

## Traceability
- Linear issue: `CO-294` / `8bbdd424-d77e-4312-b4b7-2a82c3df2749`
- Task id: `linear-8bbdd424-d77e-4312-b4b7-2a82c3df2749`
- Docs packet: `tasks/specs/linear-8bbdd424-d77e-4312-b4b7-2a82c3df2749.md`, `docs/TECH_SPEC-linear-8bbdd424-d77e-4312-b4b7-2a82c3df2749.md`, `docs/ACTION_PLAN-linear-8bbdd424-d77e-4312-b4b7-2a82c3df2749.md`
- Origin manifest: `.runs/linear-8bbdd424-d77e-4312-b4b7-2a82c3df2749/cli/2026-04-21T16-10-47-501Z-6477672f/manifest.json`
- Live issue context checked before transition on 2026-04-22 Australia/Sydney; state moved from `Ready` to `In Progress`.

## Summary
Control-host truth surfaces still drift after Linear issues leave the active running set. Released claims can retain stale `run_manifest_path` and run-state metadata, operator autopilot can recommend unblock actions from stale blocker edges, and `linear-advisory-state.json` can look current while refresh/rehydrate has moved on.

Desired outcome: retained `provider-intake-state.json` history stays auditable, but operator-facing intake/state/advisory surfaces no longer present terminal issues, stale `in_progress` manifests, stale blocker edges, or old advisory snapshots as current actionable truth.

## User Request Translation
- Treat `CO-294` as broader than `CO-292`: `CO-292` owns stale non-active issue-state refresh; `CO-294` owns stale post-release run pointers, stale operator advisory truth, and advisory-state freshness.
- Preserve exact surfaces and terms: `released claims`, `run_manifest_path`, `manifest.json status=in_progress`, `provider-intake-state.json`, `provider-operator-autopilot.jsonl`, `ready_to_unblock`, `linear-advisory-state.json`, `refresh/rehydrate`, `CO-272`, `CO-278:Done`, PR `#571`, `CO-292`, `CO-286`, and `CO-211`.
- Preserve adjacent active-lane admission and attach behavior; do not weaken live-worker rehydration, cap checks, or valid active-run attach semantics.
- Keep retained claim history available for audit; do not solve this by deleting rows or hiding display text while stale metadata remains authoritative.

## Parity / Alignment Matrix
| Surface | Current truth | Target truth / intended delta | Explicitly out of scope |
| --- | --- | --- | --- |
| Released claim run metadata | April 21 evidence found `123` released claims, `117` retaining `run_manifest_path`, and terminal issues `CO-164`, `CO-183`, `CO-186`, `CO-191`, `CO-196` pointing at `in_progress` manifests. | Operator-facing truth demotes or sanitizes stale active-looking run pointers for terminal released issues while audit history remains readable. | Deleting all retained history or weakening live-worker rehydration. |
| Operator autopilot unblock advice | `provider-operator-autopilot.jsonl` surfaced `CO-272` as `ready_to_unblock` from `CO-278:Done` while the current note says PR `#571` is draft/dirty/failing. | Autopilot suppresses or corrects unblock advice when fresher issue/PR truth contradicts retained blocker truth. | Auto-close, auto-unblock, or unrelated issue mutation. |
| Advisory state JSON | `linear-advisory-state.json` remained at `2026-03-22T04:01:03.255Z` while provider intake was live through April 21 refresh/rehydrate cycles. | Advisory JSON is refreshed or explicitly marked stale/deprecated, and stale fallback cannot outrank newer intake truth. | Removing bounded fallback support without a replacement contract. |
| Active-lane admission / attach | Adjacent lanes rely on active run evidence, live worker proof, cap checks, and provider-child provenance. | CO-294 only reconciles post-release truth; live active claims and attachable runs stay authoritative. | Weakening CO-125 provider admission or same-issue attach behavior. |

## Acceptance Criteria
- Released/non-active claims no longer surface `run_manifest_path` / run-state metadata that contradict live issue state or terminal run outcome.
- Terminal issues do not retain pointers to `in_progress` manifests in operator-facing intake/state surfaces.
- Operator autopilot unblock recommendations are suppressed or corrected when blocker truth is stale or contradicted by fresher issue/PR state.
- `linear-advisory-state.json` is refreshed truthfully from the live source or explicitly marked deprecated/stale so operators do not read it as current.
- Focused regression coverage covers these post-release/operator-truth surfaces without regressing active-lane admission/attach behavior.

## Non-Goals
- No manual deletion or broad rewrite of `provider-intake-state.json`; no scheduler, capacity, or concurrency redesign.
- No replacement of `CO-292`, weakening of live-worker/provider-child/active-run attach contracts, or auto-unblock/auto-close behavior from stale blocker edges.

## Not Done If
- `provider-intake-state.json` still carries terminal issues with `in_progress` run pointers after refresh in operator-facing truth.
- Autopilot still recommends unblock actions from stale terminal blocker edges.
- Advisory JSON still looks current while being sourced from a dead/stale path.
- The fix only changes display text without reconciling retained metadata.

## Metrics & Guardrails
- Focused tests prove terminal released claims with stale `in_progress` manifest pointers are demoted or sanitized.
- Focused tests prove stale completed-blocker-only `ready_to_unblock` advice is suppressed when fresher blocker/PR truth disagrees.
- Focused tests prove stale `linear-advisory-state.json` is not treated as current when newer intake truth exists.
- Retained intake audit evidence remains readable, adjacent active claim / live worker / attach behavior remains covered, and Linear read burn stays within existing bounded seams.
