# ACTION_PLAN: Coordinator Symphony-Aligned Init CLI Shell Extraction

## Steps

1. Reinspect `handleInit(...)`, `initCodexTemplates(...)`, and the optional `--codex-cli` follow-on setup path to keep the extraction bounded.
2. Move the binary-facing `init` shell into a dedicated helper that preserves help gating, `init codex` validation, summary emission, and managed-Codex follow-on behavior.
3. Add focused parity coverage for the extracted shell and the binary-facing command surface.
4. Run the required validation, close the lane honestly, and point to the next truthful nearby shell or freeze.
