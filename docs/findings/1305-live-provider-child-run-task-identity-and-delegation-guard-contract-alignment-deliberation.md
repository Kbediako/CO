# Findings - 1305 Live Provider Child-Run Task Identity and Delegation Guard Contract Alignment

## Decision
- Open `1305` as a new narrow docs-first follow-up lane.

## Why This Is The Right Slice
- The live provider path is already far enough along to prove ingress and claim behavior: the control host accepts real Linear deliveries and writes provider-intake claims for `CO-1` and `CO-2`.
- The current blocker is exact and reproducible: the mapped child runs fail at `stage:delegation-guard:failed` because their fallback task ids are not registry-backed top-level tasks.
- Reopening `1303` or `1304` would blur the state of already-completed lanes. The truthful follow-up is a new narrow contract-alignment lane.

## Decision Notes
- Reusing a registered task prefix to masquerade provider-started runs as subagent children of a historical implementation lane would make the guard pass, but it would also misstate what those runs are.
- A registration-only guard bypass would still fail the next pre-run requirement because provider-started runs do not begin with preexisting delegated sub-run manifests.
- The cleaner narrow design is to keep provider-started fallback task ids as runtime identity for now and teach `delegation-guard` about that sanctioned autonomous provider contract using active manifest evidence.
- The guard update must stay fail-closed and must not become a general bypass for arbitrary unregistered top-level task ids.

## Scope Boundaries
- In scope:
  - docs-first registration for `1305`
  - a narrow provider/guard contract fix
  - focused regression coverage for that contract
  - live rerun until the child run clears `delegation-guard` or a new blocker appears
- Out of scope:
  - provider setup, ingress, webhook, or secret work
  - undoing the provider-intake/execution-authority design from `1303`
  - broad delegation policy changes for ordinary top-level tasks

## Risks
- The next downstream blocker may appear immediately after `delegation-guard` passes.
- Predecessor docs currently understate the new contract mismatch; they need a small truth-sync while this lane is registered.

## Approval
- Approved for docs-first registration based on live runtime evidence and the narrow architectural mismatch.
