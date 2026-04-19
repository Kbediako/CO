# ACTION_PLAN: CO-264 backlog promotion snapshot retention policy

## Goal

Produce a docs-first packet for `CO-264` that selects a retention-first policy for `backlog_promotion_snapshots` and gives the parent lane an implementation-ready contract without touching implementation or tests in this child lane.

## Constraints

- Stay in docs phase.
- Do not edit implementation or test files.
- Do not call Linear mutation helpers.
- Do not run full repo validation suites.
- Preserve the exact protected terms listed in the PRD and task spec.

## Source Evidence

- Source anchor: `ctx:sha256:3a42ae593f1afd8a89a2ee9ef88ad1acfe18d4db4930d453565ab22e66e7433b#chunk:c000001`
- Declared shared payload: `.runs/linear-4c1c8aed-2724-4072-9218-74b55e0cc4a7-docs-packet/cli/2026-04-19T18-52-58-375Z-f391d2b8/memory/source-0/source.txt`
- Parent payload (worker-workspace relative): `../../.runs/linear-4c1c8aed-2724-4072-9218-74b55e0cc4a7/cli/2026-04-19T18-49-38-645Z-8e0e4d9a/memory/source-0/source.txt`; substantive contract is the parent-provided prompt.

## Plan

1. Create the PRD, TECH_SPEC, ACTION_PLAN, task spec, task checklist, and agent mirror for `CO-264`.
2. Register the packet in `tasks/index.json`.
3. Add a current `docs/TASKS.md` snapshot for the docs packet.
4. Add docs freshness registry rows for the six packet/mirror files.
5. Run the lightweight protected-term grep over the six packet files.
6. Run `git diff --check` over the owned files.
7. Leave the working tree changes uncommitted for parent patch export.

## Parent Integration Plan

After accepting this patch, the parent lane should:

1. Implement `resolveNextBacklogPromotionSnapshots` or the equivalent retention helper in `providerOperatorAutopilot.ts`.
2. Thread retention config and last-decision payloads through `providerWorkflowConfigStore.ts`.
3. Project retention decisions through `observabilityReadModel.ts`.
4. Add focused regressions for temporary untracked cycles, terminal-state pruning, bounded stale counters, blanket time-only deletion rejection, force-path audit output, and `CO-216` suppression.
5. Run focused validation before full parent gates.

## Exit Criteria For This Child Lane

- Packet defines retention through temporary untracked cycles by default.
- Packet defines pruning only with explicit stale/permanent evidence.
- Packet rejects a single missing tracked page as terminal evidence.
- Packet rejects blanket time-only deletion.
- Packet records audit/read-model decision inputs, including age/cycle/terminal evidence and force-path status.
- Packet preserves `CO-216` manual-demotion suppression until explicit retention policy and regressions exist.
- Lightweight docs checks pass.
