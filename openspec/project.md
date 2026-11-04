# Project Context

## Purpose

Digital Pet is a local-first progressive web app (PWA) game about caring for a virtual pet. Players adopt a pet and keep it happy and healthy by feeding it, playing with it, putting it to sleep, and taking it for walks. The experience is built around short, low-pressure check-ins: a session can last a few seconds, and the pet's state continues to change while the app is closed.

The first release is a single-player, single-pet experience that works fully offline and requires no account.

## Tech Stack

No implementation has been chosen yet. Unless a later change decides otherwise, the project assumes:

| Concern | Baseline assumption |
| --- | --- |
| Language | TypeScript (strict) |
| UI | React + Vite, or another component framework if preferred |
| PWA | Web App Manifest + service worker (for example `vite-plugin-pwa` / Workbox) |
| Persistence | IndexedDB (for example `idb` or Dexie) |
| Unit tests | Vitest + Testing Library |
| End-to-end tests | Playwright, including offline and installability checks |
| Hosting | Static hosting over HTTPS |
| Backend | None for the core game loop |

These are starting points, not requirements. The behavior specs do not depend on the stack.

## Project Conventions

### Code Style

- TypeScript strict mode; no implicit `any`.
- Small, focused modules with game balance values kept in one tunable configuration module.
- UI components are presentational; game rules live in framework-independent modules that can be unit tested.
- User-facing strings live in `src/i18n/messages.ts`. Japanese is the default language and English is the second language.
- No `console.log` noise in production builds.

### Architecture Patterns

- **Local-first:** IndexedDB is the source of truth on the device. The game must remain fully playable with the network disabled.
- **Timestamp-based simulation:** needs decay and timed activities are computed from `lastUpdatedAt` timestamps rather than background timers. Timers are only used for on-screen progress.
- **Pure game rules:** functions that apply care actions and decay take the current state plus elapsed time and return the next state. This keeps behavior testable and deterministic.
- **Explicit state machine for activity:** the pet is always in one of `awake`, `sleeping`, or `walking`. Actions are validated against that state.

### Testing Strategy

- Every scenario in `openspec/specs/` should map to at least one automated test (unit, component, or end-to-end depending on the layer).
- Game-rule tests use a controllable clock so decay and walk timers are deterministic.
- PWA tests cover offline reload, persisted state after reload, and update handling.
- Accessibility checks include keyboard-only navigation and automated axe scans on the main screen.

### Git Workflow

- Behavior changes start as an OpenSpec change under `openspec/changes/`.
- Implement, verify against the delta specs, then archive the change so the baseline specs are updated.
- Keep `openspec/specs/` as the source of truth for current behavior.

## Domain Context

### Glossary

| Term | Meaning |
| --- | --- |
| Pet | The single virtual creature the player cares for. |
| Player | The person using the app. |
| Need | A 0–100 value describing the pet's condition: fullness, energy, or happiness. |
| Fullness | How fed the pet is. Higher is better; decays over time. |
| Energy | How rested the pet is. Higher is better; drained by play and walks, restored by sleep. |
| Happiness | How content the pet is. Higher is better; raised by care actions. |
| Mood | A derived label (`happy`, `content`, `needy`, `critical`) calculated from the needs. |
| Care action | One of feed, play, sleep/wake, or walk. |
| Decay | The passive change in needs that occurs as real time passes. |
| Catch-up | Applying decay for time that passed while the app was closed or in the background. |
| Activity state | The pet's current mode: `awake`, `sleeping`, or `walking`. |
| Animation state | The pose track currently shown: `idle`, `feed`, `play`, `sleep`, `wake`, or `walk`. |
| Transient animation | A `feed`, `play`, or `wake` animation that plays once and returns to the persistent state. |
| Frame | One SVG image in an animation. |
| Frame set | The six activity frame collections for a custom animation. |
| Animation frames | A locally stored custom animation made from selected images traced to 512×512 SVG frames. |

### Design Pillars

1. **Low pressure.** The pet is never permanently lost, and absence is not punished with guilt. Returning after a long break is always recoverable.
2. **Short sessions.** Every care action is usable in seconds. Walks are the only timed activity and can run while the app is closed.
3. **Offline-first.** Core play never requires a network, an account, or a server.
4. **Clear feedback.** Every action produces an immediate, understandable reaction and a visible state change.
5. **Accessible by default.** The game is playable with a keyboard, a screen reader, and reduced motion enabled.
6. **Honest simulation.** The app never presents unreliable background behavior (such as guaranteed push notifications) as guaranteed.

### Core Game State (conceptual)

- Pet identity: `id`, `name`, `species`, `createdAt`.
- Needs: `fullness`, `energy`, `happiness`.
- Activity: `awake` / `sleeping` / `walking`, plus activity start time when walking.
- Timestamps: `lastUpdatedAt` for decay, `walkStartedAt` when walking.
- Preferences: notification opt-in, quiet hours, reduced-motion override (optional).
- Schema version for migrations.

Exact storage shape belongs in design documents, not in behavior specs.

## Important Constraints

- **PWA only.** The app must be installable and must launch offline after the first successful load.
- **Local-first, single device.** The MVP has no account, sync, or server. Clearing browser storage deletes the pet, and the UI must warn about that before a reset.
- **No permanent failure.** The pet cannot die or be lost through neglect in the MVP. Critical states are always recoverable.
- **Unreliable clocks.** Device time can move backwards or jump forwards. Catch-up must clamp elapsed time and never produce negative or unbounded changes.
- **Mobile-first.** The primary target is a phone in portrait orientation; desktop is supported but secondary.
- **Privacy.** No personal data leaves the device by default. There is no analytics or tracking in the MVP.
- **Notifications are best-effort.** Without a backend, reminders cannot be guaranteed while the app is closed. The UI must not promise otherwise.
- **Balance values are provisional.** Numeric values in the specs are initial defaults chosen for testability. Tuning them is expected and should be done by updating the relevant spec.

## External Dependencies

None required for core gameplay. Static HTTPS hosting is required for installation and service-worker support. Web Push or cross-device sync would require a backend and is explicitly out of scope for the MVP.

## Open Decisions and Future Work

These are ideas under consideration, not committed behavior. They need a proposal and delta specs before implementation.

- **Custom pets.** A quick one-image upload fills all activities; per-activity frames can override it. Custom pets are cosmetic and stored locally.
- **Multiple pets.** Letting a player keep more than one pet and switch between them.
- **Progression.** Bond levels, experience, unlockables, or evolution.
- **Food and inventory.** Specific food types, a pantry, or a currency.
- **Accounts and sync.** Cross-device backup and restore.
- **Social features.** Visiting or sharing pets with other players.
- **Widgets and richer notifications.** Home-screen widgets, reliable scheduled push.
- **Localization.** Japanese and English are supported; additional languages and right-to-left layouts remain future work.
- **Monetization.** Any paid content, cosmetics, or subscriptions.
- **Export/import.** A portable save file so players can back up or move their pet.
