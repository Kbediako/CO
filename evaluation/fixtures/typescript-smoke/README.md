# TypeScript Smoke Fixture

This fixture simulates a minimal TypeScript project that exercises the default adapter build/test/lint commands without relying on external dependencies.

- `npm run build` executes `scripts/build.js`, verifying the TypeScript source exports a `greet` function.
- `npm test` executes `scripts/test.js`, loading the TypeScript file via `ts-node/register` and asserting the greeting output.
- `npm run lint` executes `scripts/lint.js`, ensuring the source stays free of `console.*` usage.

The evaluation harness copies this directory to a temporary workspace when `requiresCleanFixture` is set, keeping the canonical fixture read-only.
