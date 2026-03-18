# Deliberation - 1294 RLM CLI Boundary Reassessment Revisit

## Decision

Open `1294` as a reassessment lane, not a claimed extraction lane.

## Why

Today’s `handleRlm(...)` is still broader than the exhausted `flow` pocket and broader than a thin parse/help handoff. The next truthful move is to reassess the current `rlm` boundary from code, then either freeze it explicitly or name one bounded remaining seam.
