# Digital Pet

A cozy, local-first PWA about adopting and caring for a virtual pet. Feed,
play, tuck your pet in for a nap, and take short walks. Needs keep changing in
real time, including while the app is closed, so a check-in can take just a few
seconds.

## Features

- Adopt one of three built-in pets: fox, cat, or bunny.
- Feed, play, sleep/wake, and walk with immediate feedback.
- Needs (fullness, energy, and happiness) decay from timestamps, with safe
  catch-up after time away.
- A five-minute walk that continues while the app is closed or offline.
- Optional in-app reminders, browser notifications, and quiet hours.
- Fully offline after the first successful load. No account, backend, or
  analytics.
- Keyboard and screen-reader friendly, with reduced-motion support and
  44 CSS pixel touch targets.
- Installable on supported browsers via the web app manifest and service
  worker.

## Local-first and offline

The pet, its needs, activity state, timestamps, and preferences are stored in
**IndexedDB on this device**. Nothing is sent to a server by default.

Because there is no cloud backup, clearing this site's browser data permanently
deletes the pet and its progress. Use the in-app reset flow only when you want to
start over.

Browser notifications are best-effort. Without a backend, the browser or device
may delay or skip reminders, especially while the app is closed. In-app
reminders still work whenever the app is open.

## Requirements

- Node.js 22 (see `.nvmrc`).
- npm 10 or newer.

## Commands

| Command | What it does |
| --- | --- |
| `npm install` | Install dependencies. |
| `npm run dev` | Start the Vite development server. |
| `npm test` | Run the unit test suite once. |
| `npm run test:watch` | Run tests in watch mode. |
| `npm run typecheck` | Run TypeScript with `--noEmit`. |
| `npm run build` | Typecheck and produce a production build in `dist/`. |
| `npm run preview` | Preview the production build locally. |
| `npm run icons` | Regenerate the PWA icons and favicon with the pure-Node script. |

## Specs

Behavior specs live in [`openspec/`](openspec/):

- [`openspec/project.md`](openspec/project.md) — purpose, constraints, and
  conventions.
- [`openspec/specs/`](openspec/specs/) — current behavior, the source of truth.
- [`openspec/changes/`](openspec/changes/) — proposed changes and delta specs.

If code and a spec disagree, treat the spec as the source of truth and update
the implementation or write a change proposal. Specs are not modified as part of
routine code changes.

## GitHub Pages deployment

The app is a static site and can be hosted on GitHub Pages:

1. In the repository, open **Settings → Pages**.
2. Under **Build and deployment → Source**, choose **GitHub Actions**.
3. Push to the `nightly` branch, or run the **Deploy to GitHub Pages** workflow
   manually from the Actions tab.

Pushes to `nightly` deploy automatically. `main` is treated as the stable branch
and is not deployed by this workflow. The workflow configures Vite's base path
from the Pages output, so assets work under the repository subpath.

The deployment workflow does not enable Pages for you: repository settings must
allow GitHub Actions as the Pages source. This is a one-time repository setting.
If Pages is not enabled, the workflow still builds the app and skips the deploy
step with a warning instead of failing.

See [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml)
for the build and deploy steps.

## Project layout

```text
src/
  App.tsx              app state, catch-up, persistence, reminders
  main.tsx             React entry point
  styles.css           cozy mobile-first design system
  components/          adoption, pet, needs, actions, art, settings
  game/                pure game rules, types, balance constants
  storage/             IndexedDB repository
scripts/
  generate-icons.mjs   dependency-free PNG/SVG icon generator
public/                generated icons and favicon
openspec/              behavior specs and proposed changes
```
