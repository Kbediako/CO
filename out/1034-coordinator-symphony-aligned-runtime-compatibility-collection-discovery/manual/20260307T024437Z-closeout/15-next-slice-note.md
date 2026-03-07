# 1034 Next Slice Note

Recommended next slice: compatibility issue identity and same-task multi-run policy.

- Why this is next:
  - `1034` gives the compatibility surface bounded sibling-run discovery, but it still picks one latest readable run per sibling task and uses task/run aliases opportunistically.
  - real Symphony issue lookup is identifier-centered over full snapshot collections, so the next remaining gap is clarifying how CO should behave when multiple runs for the same task or issue identifier coexist.
- Bounded target:
  - define an explicit compatibility issue identity policy that prefers task-scoped issue identifiers while preserving run-id lookup as a secondary alias.
  - make the discovery layer explicit about how multiple runs for one task collapse or surface in `state` / `issue` payloads.
  - keep `/ui/data.json`, Telegram oversight, and control authority on the current selected-run seam.
- Non-goals:
  - no scheduler ownership transfer
  - no retry orchestrator adoption
  - no live provider polling inside compatibility reads
