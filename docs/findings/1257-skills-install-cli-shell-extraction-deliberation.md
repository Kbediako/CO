# Findings: 1257 Skills Install CLI Shell Extraction

- `handleSkills(...)` still owns a bounded shell above `orchestrator/src/cli/skills.ts`, so this is not just residual wrapper glue.
- The remaining shell contract is specific enough to extract cleanly: help/subcommand gating, CLI flag mapping, JSON/text output shaping, and unknown-subcommand handling.
- The truthful next move is a dedicated `skills install` shell extraction rather than widening into other CLI families.
