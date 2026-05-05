# PRD - CO-434 oversized docs-freshness canonical owner reuse

## Traceability
- Linear issue: `CO-434` / `62d5261d-b0ee-4988-9f02-43b3e1c85bde`
- MCP task id: `linear-62d5261d-b0ee-4988-9f02-43b3e1c85bde`
- Source anchor: `ctx:sha256:2e32d6b56e36bbee59fcb306a7f3ac7a22e5620230bbee5ada4f255a5e95928d#chunk:c000001`
- Canonical owner key: `baseline_cohort_id_sha256:8fe99c9bccb9aba10ce27a2ac178403a2f26b80a4445c8279f52b01da699ae2d`
- Canonical owner marker: `codex-orchestrator:canonical-owner-key=baseline_cohort_id_sha256:8fe99c9bccb9aba10ce27a2ac178403a2f26b80a4445c8279f52b01da699ae2d`

## Problem
CO-434 is the generated canonical owner for an oversized docs-freshness baseline cohort id. The issue description contains the exact canonical owner key and marker, but the provider Linear reuse matcher only recognized hyphen-bulleted marker lines. CO-434's generated description uses an asterisk-bulleted `Canonical owner marker` line, so a future same-key `create-follow-up` run could miss this live owner and create a duplicate.

The maintenance state is currently clean, so this lane is not a stale-doc refresh. It is a duplicate-prevention repair for exact canonical owner matching.

## User Request Translation
- Preserve `docs:freshness:maintain`, the exact canonical owner key, terminal-owner replacement behavior, completed-lane registry residue routing, and stale active-spec routing.
- Ensure the exact canonical owner key reuses CO-434 while it is live and non-terminal.
- Cite the affected oversized cohort id, sample path tasks/tasks-2001-historical.md, and historical owner evidence `CO-175`.
- Do not weaken `docs:freshness`, `spec-guard`, or historical packet policy.

## Intent Checksum
- Protected terms: `docs:freshness:maintain`, `canonical owner key`, `terminal-owner replacement`, `completed-lane registry residue`, `stale active-spec routing`, `baseline_cohort_id_sha256:8fe99c9bccb9aba10ce27a2ac178403a2f26b80a4445c8279f52b01da699ae2d`, tasks/tasks-2001-historical.md, `CO-175`.
- Reject fuzzy title matching, blind `last_review` bumps, historical packet deletion, weakening docs/spec freshness gates, or broad provider-worker behavior changes.

## Goals
- Treat asterisk-bulleted and hyphen-bulleted exact canonical owner marker lines as equivalent stamps.
- Keep matching exact: same marker text, same team/project, non-terminal owner state, and no prefix-only reuse.
- Add focused regression coverage for CO-434's oversized canonical owner key and asterisk-bulleted marker shape.
- Preserve current clean `docs:freshness:maintain` evidence.

## Non-Goals
- No docs freshness policy, cadence, capacity, or gate weakening.
- No `last_review` bump for historical packet files.
- No deletion of historical packets or registry rows to pass gates.
- No broad Linear lifecycle, child-lane, PR, or provider-worker redesign.

## Parity / Alignment Matrix

| Surface | Current truth | Target truth | Explicitly out of scope |
| --- | --- | --- | --- |
| Canonical owner marker parsing | Hyphen-bulleted exact marker lines are reusable; asterisk-bulleted exact marker lines are not. | Both common Markdown bullet forms are exact reusable stamps. | Fuzzy title matching or substring/prefix matching. |
| CO-434 owner state | CO-434 is live in the CO project and carries the oversized canonical key in Linear. | Same-key follow-up creation reuses CO-434 rather than creating another owner. | Reopening terminal owners or changing issue state policy. |
| Freshness gates | `docs:freshness:maintain -- --format json` reports `freshness_decision=clean` and no candidate cohorts. | The code fix leaves freshness gates strict and reports no current repo debt for this issue. | Refreshing or deleting tasks/tasks-2001-historical.md. |

## Not Done If
- The exact canonical owner key can still create duplicate open owner issues.
- The matcher accepts prefix-only or fuzzy marker lines.
- Terminal owners are treated as usable without replacement action.
- The fix relies on weakening `docs:freshness`, `spec-guard`, or historical packet evidence.

## Acceptance Criteria
1. CO-434 remains stamped with the exact canonical owner marker and is live/non-terminal during validation.
2. Same-key canonical owner search reuses an asterisk-bulleted marker line without calling issue creation.
3. Focused tests cover the oversized hashed key and prove `action=reused`.
4. Action evidence cites the oversized cohort id, sample path, configured historical owner evidence, and clean maintenance output.

## Fallback / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? Yes.
- Decision: justify retaining the exact marker contract as a supported compatibility surface. Owner: CO-434. Trigger: generated Linear descriptions may use either `-` or `*` Markdown bullets. Introduced date: 2026-05-05. Review date: 2026-05-05. Maximum lifetime: non-expiring supported parsing contract. Removal condition: a future canonical-owner schema stops relying on Markdown issue-description bullets. Validation: focused `ProviderLinearWorkflowFacade` regression plus strict prefix-mismatch tests.
- Large-refactor check: a broader canonical-owner schema migration is not needed for this repair because the existing exact-marker search remains the authority; this patch expands only the accepted Markdown list marker while preserving exact marker text.

## Approvals
- Pre-implementation issue-quality review: parent provider worker, 2026-05-05. CO-434 is narrower than docs freshness policy work and is not eligible for blind freshness refresh.
