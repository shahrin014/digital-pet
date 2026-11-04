# Digital Pet

A cozy, local-first PWA about adopting and caring for a virtual pet. Feed,
play, tuck your pet in for a nap, and take short walks. Needs keep changing in
real time, including while the app is closed, so a check-in can take just a few
seconds.

## Features

- Adopt one of three built-in pets: fox, cat, or bunny.
- Japanese-first interface with an English language option in Settings.
- Feed, play, sleep/wake, and walk with immediate feedback.
- Needs (fullness, energy, and happiness) decay from timestamps, with safe
  catch-up after time away.
- A five-minute walk that continues while the app is closed or offline.
- Optional in-app reminders, browser notifications, and quiet hours.
- Built-in activity animations for idle, feeding, playing, sleeping, waking, and walking.
- Motion preference: follow the device, always animate, or always reduce motion.
- Installable on supported browsers, with a dismissible install banner, browser
  install prompt, iOS Add to Home Screen guidance, and an Install app section in
  settings.
- Custom animations: select 1–24 images per activity. PNG, JPEG, WebP, and SVG
  are accepted; raster images are normalized to 512×512 SVG frames in the
  browser before being saved locally. See
  [`docs/animation-packs.md`](docs/animation-packs.md).
- Separate **Reset pet** and **Delete local database** actions: reset starts a
  new pet while keeping preferences; deleting the database removes the pet,
  progress, preferences, and reminder timestamps.
- Fully offline after the first successful load. No account, backend, or
  analytics.
- Keyboard and screen-reader friendly, with reduced-motion support and
  44 CSS pixel touch targets.

## Language

Japanese is the default language. Open **Settings → Language** to switch to
English. The choice is saved locally and restored on the next launch.

## Local-first and offline

The pet, its needs, activity state, timestamps, and preferences are stored in
**IndexedDB on this device**. Nothing is sent to a server by default.

Because there is no cloud backup, clearing this site's browser data permanently
deletes the pet and its progress. Use the in-app reset flow only when you want to
start over. **Settings → Delete local database** removes the IndexedDB database
itself, including preferences and reminder timestamps.

Browser notifications are best-effort. Without a backend, the browser or device
may delay or skip reminders, especially while the app is closed. In-app
reminders still work whenever the app is open.

## Custom animations

Open **Settings → Pet appearance → Manage animation**. The dialog shows all six
current animations at once. Select an activity card to edit its frames, upload
new images, or use **Copy to all activities** to make a custom pet from one image.

PNG, JPEG, WebP, and SVG are accepted. Each image is normalized to a 512×512
frame with contain scaling, bottom-center alignment, and a transparent
background, then traced into SVG paths with a client-side vectorizer and stored
locally in IndexedDB. Frames are sorted by filename, so name them in playback
order. FPS is editable per activity.

See [`docs/animation-packs.md`](docs/animation-packs.md) for the full format,
limits, and safety rules.

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

If the deploy job reports `Branch "nightly" is not allowed to deploy to
github-pages due to environment protection rules`, open **Settings →
Environments → github-pages → Deployment branches and tags** and allow the
`nightly` branch (or remove the restriction).

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
