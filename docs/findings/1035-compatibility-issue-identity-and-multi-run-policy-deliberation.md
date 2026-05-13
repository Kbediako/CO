# Findings - 1035 Compatibility Issue Identity and Multi-Run Policy

## Context

- `1034` completed bounded sibling runtime discovery for compatibility `state` / `issue`, but the closeout explicitly parked the next gap as issue identity and same-task multi-run behavior.
- Real Symphony compatibility presentation is issue-centered over snapshot collections rather than “latest readable run per task” heuristics.

## Smallest Next Slice

- Define an explicit compatibility issue identity policy.
- Allow bounded multi-run discovery to reason about multiple active runs contributing to one issue identifier.
- Keep run-id lookup as a secondary alias into that issue identity, with canonical issue-identifier lookup winning before alias fallback.

## Why This Is Next

- It tightens the new `1034` discovery seam without broadening authority or transport behavior.
- It removes a foreseeable ambiguity before CO accumulates more autonomous reruns/retries under one task identity.
- It continues the real-Symphony presenter alignment while keeping CO’s harder current-run control model.

## Guardrails

- No scheduler ownership or retry orchestration adoption.
- No UI/Telegram migration onto the compatibility collection surface.
- No live provider polling inside compatibility reads.
