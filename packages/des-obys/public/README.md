# Des-Obys Mirror Assets

`packages/des-obys/public/` is intentionally a tracked placeholder until fresh local mirror assets are generated. No historical snapshot is tracked in fresh checkouts after Task 0801 dead-code pruning.

Regenerate from the repo root with:

```bash
npm run mirror:fetch -- --project des-obys
npm run mirror:check -- --project des-obys
```

Serve the rebuilt mirror locally with:

```bash
npm run mirror:serve -- --project des-obys --port 4173
```

Mirror fetch writes fresh `public/` contents for local review and task-scoped manifests under `.runs`; do not commit ignored `.runs` archive payloads as a substitute for a fresh capture.
