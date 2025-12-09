# Obys Library Clone

Pixel-perfect local clone of https://library.obys.agency for HiFi toolkit testing. The prior static payload now lives in `.runs/0801-dead-code-pruning/archive/2025-12-08T10-01-24Z/packages/obys-library/public/`.

## Run locally

1. Restore assets from the archive above or re-run the mirror fetch to repopulate `public/`.
2. `cd packages/obys-library`
3. `npm start` (shared mirror harness defaults to port 4173, honors `PORT`, CSP flag `MIRROR_CSP=self|strict|off`, and byte-range support for media)
4. Open `http://localhost:4173` for the mirrored experience.

## Structure

- `public/` — mirrored HTML for all routes; currently a README pointer until assets are restored.
- `mirror.config.json` — origin/routes/rewrites used by the root mirror:fetch + mirror:check scripts.
- `package.json` — scripts for serving the site; no external dependencies required.

## Notes

- Google Analytics/gtag removed; no third-party trackers load once assets are restored.
