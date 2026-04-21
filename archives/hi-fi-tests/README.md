# Hi-Fi Test Archives

Task 0801 removed the checked-in `archives/hi-fi-tests` payload, so fresh checkouts should treat this directory as a stub instead of expecting a durable `.runs/...` archive copy.

To regenerate reviewer-usable captures:
- follow `docs/README.md` under `Hi-Fi Design Toolkit Captures`
- configure the target source in `design.config.yaml`, then run `npx @kbediako/codex-orchestrator start hi-fi-design-toolkit --format json --task <task-id>`
- keep any intentionally retained snapshot guidance under `reference/` with a local README, following `reference/README.md`
