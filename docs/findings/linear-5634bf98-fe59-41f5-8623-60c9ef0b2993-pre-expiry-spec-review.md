# CO-579 Pre-Expiry Spec Review

Review date: 2026-05-24

## Scope
CO-579 reviewed the active `tasks/specs/**` rows that were within seven days of `spec-guard` expiry. The review did not mark any of these specs done, archived, or terminal. Each row remains active or blocked because this lane did not verify local completion for the underlying work.

## Decision
Refresh review metadata only for the scoped active specs below. The review found no spec contract edits required for CO-579, and no row was archive-ready from this lane. Broader lifecycle/finalizer authority remains linked to CO-580.

| Spec | Title | Retained status | Decision |
| --- | --- | --- | --- |
| `tasks/specs/linear-033979b5-6903-4d5f-9c9b-41769aa69330.md` | CO-447 ready-review CodeRabbit acknowledgement-only mention classification | active | Retain active/blocked; no spec contract change required. |
| `tasks/specs/linear-213f6858-ab77-40b9-b80a-f5e5bdde4b37.md` | CO-450 Codex binary provenance in doctor | active | Retain active/blocked; no spec contract change required. |
| `tasks/specs/linear-345cd50c-4962-4376-a7ca-1982ba311699.md` | CO-445 provider merge closeout live docs:freshness owner terminal guard | in_progress | Retain active/blocked; no spec contract change required. |
| `tasks/specs/linear-3ed4e0c0-4a6a-428b-bf31-d6252f230377.md` | CO-443 completed intake claim live-truth recovery | in_progress | Retain active/blocked; no spec contract change required. |
| `tasks/specs/linear-552f2825-b9e0-4f14-afe0-21b072aa9bb5.md` | CO-446 target-keyed last_audit_operation projection | in_progress | Retain active/blocked; no spec contract change required. |
| `tasks/specs/linear-590e4e09-315a-4957-bb72-66b8322e86a6.md` | CO-472 Ready released-pending-reopen no-run explicit recovery | active | Retain active/blocked; no spec contract change required. |
| `tasks/specs/linear-5d677c44-06c1-43ca-9aac-5a74f96671b4.md` | CO-431 canonical-owner docs freshness automation | in_progress | Retain active/blocked; no spec contract change required. |
| `tasks/specs/linear-6d7e842c-b10a-42f5-a7e0-8a30a8dd9442.md` | CO-468 control-host accepted no-run pending revalidation recovery | in_progress | Retain active/blocked; no spec contract change required. |
| `tasks/specs/linear-6df648e0-4a48-45a2-bdd3-aeaa9c1deb2b.md` | CO-444 re-home docs:freshness:maintain owner after terminal CO-441 | in_progress | Retain active/blocked; no spec contract change required. |
| `tasks/specs/linear-8098459b-be08-4f9f-8e45-bd315fb4c9b9.md` | CO-408 durable child-lane decision lineage | active | Retain active/blocked; no spec contract change required. |
| `tasks/specs/linear-8bd36e2e-2e54-4c8d-ae79-7b1319fc6adc.md` | CO-461 provider docs-review child-stream task identity guard compatibility | active | Retain active/blocked; no spec contract change required. |
| `tasks/specs/linear-9aedac3e-09df-4859-b818-b6f2d4dc8ccc.md` | CO-454 resolve March 31 docs freshness candidate cohorts | in_progress | Retain active/blocked; no spec contract change required. |
| `tasks/specs/linear-b78c98eb-8ed4-4e19-9099-81d5e34bb33c.md` | CO-430 re-home live docs freshness maintenance owner after terminal CO-425 | in_progress_owner_rehome | Retain active/blocked; no spec contract change required. |
| `tasks/specs/linear-b9a1044e-03b0-49ef-8435-92840eaf90b9.md` | CO-429 CO-41 March 30 docs freshness registry residue | blocked | Retain active/blocked; no spec contract change required. |
| `tasks/specs/linear-b9e7583a-3051-40d3-a87f-0388faa9df61.md` | CO-441 re-home live docs freshness maintenance owner after terminal CO-427 | in_progress | Retain active/blocked; no spec contract change required. |
| `tasks/specs/linear-bdfd9046-97b5-43bd-850f-b305558cdada.md` | CO-466 Codex CLI 0.128.0 release-intake | active | Retain active/blocked; no spec contract change required. |
| `tasks/specs/linear-d412792b-9a2a-43d9-96dc-ca021e728d09.md` | CO-452 retire js_repl posture after Codex CLI 0.128.0 removal | active | Retain active/blocked; no spec contract change required. |
| `tasks/specs/linear-d536879d-3ddc-47b0-ae37-0ab657af18ba.md` | CO-459 stale top-level provider_intake versus fresh raw provider-intake-state authority | active | Retain active/blocked; no spec contract change required. |
| `tasks/specs/linear-d78c6860-93f6-4936-b3ad-b40e8de8a566.md` | CO-427 re-home docs:freshness:maintain owner after terminal CO-425 | in_progress | Retain active/blocked; no spec contract change required. |
| `tasks/specs/linear-dc2bb702-db1d-450c-be19-a98571289a21.md` | CO-428 own March 30 active-spec spec-guard baseline cohort | in_progress | Retain active/blocked; no spec contract change required. |
| `tasks/specs/linear-f57f28e8-e876-4bff-9217-fc5e17ee030f.md` | CO-458 source-root freshness drift | in_progress | Retain active/blocked; no spec contract change required. |

## Follow-Up
CO-580 owns the deeper lifecycle resolver and owner-finalizer contract. This CO-579 review intentionally avoids treating task-spec frontmatter alone as archive readiness or terminal lifecycle authority.
