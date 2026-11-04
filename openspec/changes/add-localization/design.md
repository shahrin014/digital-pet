# Design: Localization and Settings Navigation

## Technical Approach

### Locale layer

Add `src/i18n/messages.ts` with two typed dictionaries:

- `ja`: the default Japanese dictionary
- `en`: the English dictionary

Export a `MessageKey` union derived from the dictionaries and a `t(key, params?)` helper. A `LocaleProvider` supplies the active locale and translator through React context. The provider also sets `document.documentElement.lang` whenever the locale changes.

Keep Japanese and English keys in parity with a unit test that compares the key sets.

### Preferences and migration

Add `locale: 'ja' | 'en'` to preferences, defaulting to `ja`. The IndexedDB preference normalizer fills `locale: 'ja'` for legacy records. The existing reset-pet flow keeps preferences, so it keeps the locale. Delete local database clears preferences, so the next launch defaults to Japanese.

### Runtime messages

The game engine currently returns English sentences. Replace those with structured results:

```ts
type ActionResult = {
  pet: Pet;
  changed: boolean;
  messageKey: MessageKey;
  messageParams?: Record<string, string | number>;
  kind: MessageKind;
};
```

The UI translates the key at render time. Tests can assert keys and parameters instead of English copy. Notifications and reminder text use the same helper.

### Component copy

Move all visible copy from components into dictionaries:

- Adoption and validation
- Main pet screen, need labels, mood labels, action controls
- Settings, install guidance, notifications, motion, language
- Animation dialog, frame errors, preview labels
- Toasts, storage warnings, error screens, accessible labels

Pet names and file names interpolate as parameters and are never translated.

### Locale formatting

Use `Intl.NumberFormat` for percentages and `Intl.DateTimeFormat` for any displayed dates, with the active locale. The walk timer remains `m:ss`, which is locale-neutral.

### Settings and navigation

Keep the header gear button. Settings is a modal sheet with the existing sections plus:

1. Install app
2. Language
3. Notifications
4. Quiet hours
5. Motion
6. Pet appearance
7. Your data
8. Reset/delete actions

The Language section uses a radio group or select with 日本語 and English. Selecting an option applies immediately and persists. No hamburger menu, drawer, or tab bar is added in the MVP.

## Architecture Decisions

### Decision: Japanese default, English second

Japanese is the primary language even when the browser is English. The player can switch to English from Settings. This matches the product direction and makes Japanese the stable default for first-run and legacy saves.

### Decision: Typed dictionaries, not runtime-loaded locale files

Two locales with a few hundred keys do not need async loading. Bundling both dictionaries keeps offline behavior simple and lets key parity be tested at build time.

### Decision: Structured engine results

Returning message keys and parameters keeps the pure game engine language-agnostic and testable. Translating in the UI ensures the active locale is always respected.

### Decision: Gear, not hamburger

There is one secondary surface. A gear button is direct, discoverable, and keyboard-friendly. A hamburger would add a navigation layer the MVP does not need.

## File Changes

- `src/i18n/messages.ts` — Japanese and English dictionaries.
- `src/i18n/LocaleProvider.tsx` — provider, `useLocale`, `t()`.
- `src/game/types.ts`, `engine.ts`, `engine.test.ts` — structured messages.
- `src/game/constants.ts`, `src/game/types.ts`, `src/storage/repository.ts` — locale preference.
- `src/App.tsx`, components — use translations.
- `src/styles.css` — Japanese font stack and 320 px checks.
- `src/i18n/messages.test.ts` — key parity.
- `README.md`, `openspec/project.md` — document the language policy.

## Error Handling

- Missing key: fall back to Japanese.
- Unknown saved locale: normalize to Japanese.
- Storage failure: localized storage warning.
- Animation and file errors: localized summary plus unchanged file names.
- Notification permission denial: localized explanation.

## Testing Strategy

- Unit-test key parity between `ja` and `en`.
- Unit-test locale normalization and defaulting.
- Unit-test engine message keys and parameters.
- Test locale switching, persistence, reset behavior, and document language.
- Verify Japanese at 320 px in Playwright or manual screenshots.
- Check accessible names in both locales.
