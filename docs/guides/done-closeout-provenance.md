# Done Closeout Provenance

CO issues in Linear `Done` must not leave local task mirrors that still look actionable. When a local mirror keeps historical pending rows after a merged PR or validation-only closeout, record an explicit stale-mirror waiver in `docs/done-closeout-provenance.json` and keep the evidence local enough for agents and CI to verify.

Run the read-only checker:

```bash
npm run done-closeout:check -- --manifest docs/done-closeout-provenance.json
```

The checker reads only the manifest and local files. It does not call Linear or GitHub, and it does not mutate mirror files. Its JSON report lands under `out/<task-id>/done-closeout-provenance-report.json` unless `--report` is supplied.

In provider-worker closeout runs, the checker also consumes `CODEX_ORCHESTRATOR_ISSUE_ID` and `CODEX_ORCHESTRATOR_ISSUE_IDENTIFIER` when both are present. That live issue authority lets the default `npm run done-closeout:check` path validate the active issue's `tasks/index.json` row even when the issue is not listed in `docs/done-closeout-provenance.json`. For manual closeout checks outside a provider-worker run, pass both `--issue-id <uuid>` and `--issue-identifier <CO-id>` together.

## Terminal Mirror Rule

For implementation issues that are already `Done`, the local task checklist, `.agent/task` mirror, `docs/TASKS.md` snapshot, and relevant task docs must either:

- have no pending closeout rows, or
- carry a waiver in `docs/done-closeout-provenance.json` that is tied to the exact current pending-row set.

Use `stale_mirror_only` when Linear is `Done`, the attached PR is merged, required checks are green, and no fresh functional repro exists. A stale checklist row is provenance debt, not proof that implementation failed.

The checker treats checkbox rows, `Reviewer:` / `Engineering:` pending notes, and issue-scoped `docs/TASKS.md` snapshot prose such as remaining-work or handoff language as pending terminal mirror rows. The preferred waiver form is `scope: "pending_rows_hash"` with the current pending row count and hash. That makes the waiver fail if new pending rows are added or the stale row set changes.

Every stale-mirror waiver must include `reason`, `reviewed_at`, and at least one `evidence` entry. Evidence can be a merged PR URL, a `linear-workpad:<comment-id>` pointer, or a tracked local closeout note.

## Validation-Only Done Issues

No-PR validation-only issues can be legitimate. They still need a local closeout pointer so their outcome does not depend only on Linear comments. Acceptable pointers include a tracked closeout note, a retained `out/<linear-id>/manual/workpad.md` pointer, or an equivalent local evidence summary.

CO-170 is backfilled through `docs/closeout-provenance/linear-ae5b2b98-f03e-44fd-9c13-a4d58457d8cb.md` because the current CO-178 workspace does not carry the original `out/` artifacts.

## Future Provider-Worker Closeout

After a provider-worker PR merges and before moving an issue to `Done`, update terminal mirrors or add a stale-mirror waiver with:

- Linear issue id and identifier.
- PR URL, merge commit, merge timestamp, and required check conclusions when a PR exists.
- Workpad or local closeout pointer.
- Mirror paths scanned.
- Pending-row count and hash for any intentionally retained stale rows.
- A clean `tasks/index.json` terminal row for the same issue. The default provider-worker checker path validates this from the live issue env; manual runs must pass both live issue flags.

This checker is limited to terminal mirror and closeout provenance. It does not duplicate CO-172 manifest-summary truthfulness checks.
