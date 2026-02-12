# Repository Guidelines

## Project Structure & Module Organization

- `app/`: Static web app (no build step). Key files: `index.html`, `script.js`, `styles.css`, plus assets in `images/` and audio in `sounds/`.
- `chrome-extension/`: Chrome Extension (Manifest V3). Key files: `manifest.json`, `popup.html`, `popup.js`, `audioWorker.js`, plus `images/` and `sounds/`.
- Root tooling: `package.json` (dev scripts), `Dockerfile` + `docker-compose.yml` (serve `app/` via Nginx).

## Build, Test, and Development Commands

- `npm ci`: Install dev dependencies (currently used for the local dev server).
- `npm run dev`: Serve `app/` locally at `http://localhost:8284` (via `live-server`).
- `npm run docker:build`: Build the Nginx image that serves `app/`.
- `npm run docker:up` / `npm run docker:down`: Start/stop the container (maps host `8284 -> 80`).
- Chrome extension: load `chrome-extension/` via “Load unpacked” (Developer Mode) and test against `http://localhost:8284`.

## Coding Style & Naming Conventions

- Indentation: use **4 spaces** in JS/CSS to match existing files.
- JavaScript: keep it browser-native (no bundler). Prefer `const`/`let`, and keep UI wiring inside `DOMContentLoaded`.
- Sound IDs must stay consistent across HTML `data-sound`, JS keys, and filenames, e.g. `data-sound="waves"` → `app/sounds/waves.mp3`.
- Styling: TailwindCSS is loaded via CDN in HTML; project-specific rules live in `app/styles.css` and `chrome-extension/popup.css`.

## Testing Guidelines

No automated test suite is configured (`npm test` is a placeholder). Please do a quick manual smoke test:

1. Web app: play/pause sounds, adjust volume sliders, save/delete mixes, toggle theme.
2. Extension: verify saved mixes load from the active White Wave tab and playback starts/stops correctly.

## Commit & Pull Request Guidelines

- Commit messages in this repo are short, descriptive phrases (e.g. “volume slider updated”, “MVP working”). Keep commits focused on one change.
- PRs: include a clear description, steps to verify, and screenshots for UI changes. If adding/changing audio assets, note source/licensing.

## Security & Configuration Tips

- Don’t commit secrets; keep `.env` local (already gitignored).
- Avoid committing dependency artifacts like `node_modules/`; prefer reproducible installs via `npm ci`.
