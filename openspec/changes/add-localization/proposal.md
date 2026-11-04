# Proposal: Localization and Settings Navigation

## Why

The app is currently English-only, but Japanese should be the primary language and English the secondary language. The main screen also needs a clear, one-tap way to reach Settings without introducing navigation that the app does not need.

## What Changes

- Add Japanese (`ja`) as the default language and English (`en`) as the second language.
- Add a Language section to Settings with 日本語 and English options.
- Persist the selected language with the other preferences and update the document language.
- Move all user-facing strings into typed Japanese and English message dictionaries.
- Localize actions, validation, errors, reminders, install guidance, and animation flows.
- Keep Settings behind the existing header gear button; do not add a hamburger menu or drawer in the MVP.
- Use `Intl` for locale-sensitive numbers and dates.
- Add a Japanese font stack and verify the layout at 320 px.

## Scope

In scope:

- Japanese default and English second.
- Language selector and persistence.
- Message dictionaries and translation helper.
- Localizing existing screens and runtime messages.
- Localizing notifications, install prompts, and error messages.
- Japanese typography and narrow-screen layout.
- Accessible labels in the active language.
- Tests for key parity, persistence, switching, and layout.

Out of scope:

- Additional languages beyond Japanese and English.
- Right-to-left layouts.
- Translating player-authored content such as pet names.
- Server-side or per-request locale negotiation.
- A hamburger menu, drawer, or bottom tab bar in the MVP.

## Approach

Add a small typed i18n layer with Japanese and English dictionaries, a `t()` helper, and a locale provider. Store `locale` in preferences, defaulting to `ja` and normalizing legacy preferences to `ja`. Convert runtime messages from the game engine into message keys plus parameters so the UI decides the language. Apply `Intl` for numbers and dates where the app displays them, update `<html lang>` on change, and add a Language section to the existing Settings dialog. Keep the header gear button as the only Settings entry point.

## Impact

- `localization`: new capability for languages, selection, persistence, and formatting.
- `pet-ui`: Settings access requirement and Japanese layout/typography.
- Preferences and storage migration.
- Game engine action results and tests.
- Notifications, install banner, animation dialogs, and error handling.
- README and project context.

## Open Questions

- Should the installed PWA name become 「デジタルペット」 or remain the brand “Digital Pet”? The plan keeps the brand name for now and localizes on-screen titles and descriptions.
- Should the language control also get a header shortcut later? Not in the MVP; Settings is the single entry point.
