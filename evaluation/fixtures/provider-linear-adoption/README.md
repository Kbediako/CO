# Provider Linear Adoption Fixtures

These fixtures are sanitized provider-run adoption records for `npm run eval:provider-adoption`.

Each fixture directory contains:

- `manifest.json` - a trimmed run manifest with `memory.source_0`, `prompt_packs`, and planner `selectedMemoryRefs` metadata.
- `provider-linear-worker-proof.json` - a trimmed provider worker proof with parallelization, child-lane, workpad, and follow-up audit surfaces.
- `prompt-artifacts.json` - sanitized prompt metadata proving which source and prompt-pack references reached the provider prompt.

Do not place raw private transcripts, unsanitized Linear issue text, secrets, or operator content in these fixtures. Add only pointer metadata, redacted identifiers, and short synthetic summaries needed for deterministic assertions.
