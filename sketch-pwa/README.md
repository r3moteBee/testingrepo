# Sketch CRUD

A simple Progressive Web App for sketching and managing drawings using IndexedDB.

## What it is
A pure drawing engine with a web interface that allows users to draw, save, rename, and delete sketches. It works offline thanks to a Service Worker.

## Run locally
From the `sketch-pwa/` directory, run:
```bash
python3 -m http.server
```
Then open `http://localhost:8000` in your browser.

## Deploy
This app is designed to be GitHub Pages friendly. All paths are relative. Simply push the `sketch-pwa/` folder content to a GitHub repository and enable Pages.

## Data Storage
Data is stored locally in your browser using **IndexedDB** (database name: `sketch-pwa`). No backend is required.

## Architecture
- `canvas.js`: Pure drawing engine logic (no DOM access).
- `storage.js`: IndexedDB CRUD operations.
- `app.js`: DOM wiring and event handling.
- `sw.js`: Service worker for offline-first capability (cache-first strategy).
- `index.html` & `styles.css`: UI shell and responsive layout.

## Testing
- The pure drawing engine (`canvas.js`) and CRUD logic (`storage.js`) are covered by Node.js tests in `test.js`.
- DOM wiring, pointer events, and service worker behavior are not covered by automated tests.
