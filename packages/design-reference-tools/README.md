# Autonomous High‑Fidelity Design Starter

This scaffold wires up the three phases you outlined:

1) **Context Acquisition** — extract real CSS from an allowed reference site.
2) **Artifact Creation** — generate a pixel‑checked reference page and a Style Guide (MD).
3) **Autonomous Application** — publish tokens, ship reusable components, and integrate into a Next.js app for on‑brand generation (including Framer Motion primitives).

> ⚠️ **Licensing**: Only run extraction against sources you own or have permission to replicate. Copy `compliance/permit.example.json` to `compliance/permit.json` and keep it updated.

## Quickstart

```bash
# install workspace (pnpm recommended)
corepack enable
pnpm i

# run CSS extraction (example)
pnpm -C tools/extractor extract --url https://example.com --out .out/example

# build tokens + styleguide from extracted CSS
pnpm -C tools/extractor tokens --in .out/example/raw.css --out .out/example
pnpm -C tools/styleguide build --tokens .out/example/tokens.json --out docs

# generate reference page from computed styles snapshot
pnpm -C tools/extractor refpage --snapshot .out/example/computed.json --css .out/example/raw.css --out .out/example/reference

# self‑correction loop (visual diff + token nudges)
pnpm -C tools/extractor self-correct --reference-url https://example.com --candidate file:.out/example/reference/index.html --work .out/example

# wire tokens into UI package and Next.js app
pnpm -C packages/design-tokens build
pnpm -C apps/web dev
```

Monorepo layout:
```
apps/web/                     # Next.js demo app that consumes tokens + UI
packages/ui/                  # Reusable components styled by CSS variables
packages/design-tokens/       # Design token source + CSS variable build
tools/extractor/              # CSS extraction + tokenization + reference gen + self-correct
tools/styleguide/             # Style Guide generator (Markdown)
prompts/                      # LLM prompt templates that force high‑fidelity usage
.github/workflows/ci.yml      # Visual regression for PRs
compliance/permit.json        # List of allowed sources + licenses (copy from permit.example.json)
```
