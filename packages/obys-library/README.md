# Obys Library Clone

Pixel-perfect local clone of https://library.obys.agency for HiFi toolkit testing. Tracked checkout only retains the mirror configuration, package harness, and a placeholder `public/` README. The prior Task 0801 static payload is not a durable repository artifact and should not be restored from ignored local archive output.

## Run locally

1. From the repo root, refresh the mirror: `npm run mirror:fetch -- --project obys-library`
2. Validate the regenerated mirror: `npm run mirror:check -- --project obys-library`
3. Serve through the shared harness: `npm run mirror:serve -- --project obys-library --port 4173`
4. Open `http://localhost:4173` for the mirrored experience.

The package-level `npm start` also serves this project through the shared mirror harness after `public/` has been regenerated. Set `MCP_RUNNER_TASK_ID=<task-id>` before mirror commands when you need manifests routed to a task-scoped local run directory.

## Structure

- `public/` — mirrored HTML for all routes after regeneration; currently a README placeholder.
- `mirror.config.json` — origin/routes/rewrites used by the root mirror:fetch + mirror:check scripts.
- `package.json` — scripts for serving the site; no external dependencies required.

## Notes

- Google Analytics/gtag removed; no third-party trackers load once assets are restored.
