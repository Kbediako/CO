# Instruction Resolution

Codex Orchestrator discovers human-facing instructions by walking three well-known locations. The loader merges files in the following order:

1. Repository root `AGENTS.md`
2. `docs/AGENTS.md`
3. `.agent/AGENTS.md`

Each file is optional. Earlier layers provide defaults; downstream files append additional sections or override guidance as needed. The resolved content is concatenated with blank lines separating each source.

During run bootstrap the orchestrator records two manifest fields:

- `instructions_hash` – SHA-256 hash of the combined instruction text (`null` when no instructions are present).
- `instructions_sources` – relative paths for every discovered file, in merge order.

Use this hash to audit runs and detect instruction drift over time. For example, CI can compare the latest hash with a known-good value before promoting a build.

## Authoring Tips

- Keep global defaults in the repository root `AGENTS.md` (e.g., company-wide review etiquette).
- Use `docs/AGENTS.md` for project-level additions such as coding conventions or dependency policies.
- Place sprint- or task-specific guidance in `.agent/AGENTS.md`; this file lives alongside `.agent/task/**` mirrors.

All files are treated as Markdown and concatenated verbatim, so standard headings and bullet lists render correctly in downstream tools.
