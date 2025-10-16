# Codex-Orchestrator Learning Library

The learning library captures reusable automation assets that Codex agents can ingest across repositories.

## Asset Types
- **Codemods** — Deterministic transforms powered by jscodeshift to modernize orchestrator code.
- **Linters** — ESLint custom rules that enforce guardrails (no console usage, manifest hygiene, etc.).
- **Templates** — Markdown scaffolds for human-readable hand-offs and reviews.

## Getting Started
1. `npm run build:patterns` — Compiles TypeScript sources to `dist/patterns/**`.
2. `npm test -- patterns` — Runs codemod and linter regression suites.
3. Inspect `patterns/index.json` for asset metadata, versions, and CLI usage notes.

## Codemod Examples

### structured-event-emit
```ts
// Before
eventBus.emit('plan:completed', { task, plan });

// After
eventBus.emit({ type: 'plan:completed', payload: { task, plan } });
```

### ensure-run-summary-fields
```ts
// Before
return { taskId, plan, build, test, review };

// After
return {
  taskId,
  plan,
  build,
  test,
  review,
  mode,
  timestamp: new Date().toISOString()
};
```

See individual directories for additional documentation and guardrail notes.
