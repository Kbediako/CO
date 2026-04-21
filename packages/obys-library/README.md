# Obys Library Clone

Pixel-perfect local clone of https://library.obys.agency for HiFi toolkit testing. Task 0801 removed the checked-in static payload, so fresh checkouts should regenerate `packages/obys-library/public/` with the mirror scripts instead of expecting a durable `.runs/...` archive copy.

## Run locally

1. Regenerate assets with `npm run mirror:fetch -- --project obys-library`.
2. `cd packages/obys-library`
3. `npm start` (shared mirror harness defaults to port 4173, honors `PORT`, CSP flag `MIRROR_CSP=self|strict|off`, and byte-range support for media)
4. Open `http://localhost:4173` for the mirrored experience.

## Structure

- `public/` — mirrored HTML for all routes; currently a README pointer until assets are restored.
- `mirror.config.json` — origin/routes/rewrites used by the root mirror:fetch + mirror:check scripts.
- `package.json` — scripts for serving the site; no external dependencies required.

## Notes

- Google Analytics/gtag removed; no third-party trackers load once assets are restored.
