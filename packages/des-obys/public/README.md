# Des-Obys Mirror Assets

This tracked directory is intentionally a placeholder until fresh local mirror assets are generated.

Regenerate from the repo root with:

```bash
npm run mirror:fetch -- --project des-obys
npm run mirror:check -- --project des-obys
```

Mirror fetch writes fresh `public/` contents for local review and task-scoped manifests under `.runs`; do not commit ignored `.runs` archive payloads as a substitute for a fresh capture.
