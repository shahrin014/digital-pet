# Tasks

## 1. Localization infrastructure

- [ ] 1.1 Add typed Japanese and English message dictionaries.
- [ ] 1.2 Add a `LocaleProvider`, `useLocale`, and `t(key, params)` helper.
- [ ] 1.3 Add a key-parity test that fails when the dictionaries diverge.
- [ ] 1.4 Update `<html lang>` when the locale changes.
- [ ] 1.5 Add `locale: 'ja' | 'en'` to preferences, defaulting to Japanese.
- [ ] 1.6 Normalize legacy preferences without a locale to Japanese.

## 2. Runtime messages

- [ ] 2.1 Replace engine result sentences with message keys and parameters.
- [ ] 2.2 Update engine tests to assert keys and parameters.
- [ ] 2.3 Localize reminder and browser-notification text.
- [ ] 2.4 Localize storage, adoption, and install errors.
- [ ] 2.5 Localize animation conversion and validation errors.

## 3. Interface copy

- [ ] 3.1 Localize the adoption screen and validation messages.
- [ ] 3.2 Localize the main pet screen, needs, mood, and action controls.
- [ ] 3.3 Localize Settings, install guidance, notifications, quiet hours, and motion.
- [ ] 3.4 Localize the animation dialog, previews, and remove flow.
- [ ] 3.5 Localize accessible names and live-region messages.
- [ ] 3.6 Localize document titles and install-banner copy.

## 4. Language selector and navigation

- [ ] 4.1 Add a Language section to Settings with 日本語 and English.
- [ ] 4.2 Apply the language immediately and persist it.
- [ ] 4.3 Keep the header gear as the only Settings entry point.
- [ ] 4.4 Confirm no hamburger menu or drawer is introduced.
- [ ] 4.5 Preserve the locale across pet reset and reset to Japanese after local database deletion.

## 5. Japanese layout

- [ ] 5.1 Add a Japanese system-font stack.
- [ ] 5.2 Check Japanese layout at 320 px without clipping or horizontal scrolling.
- [ ] 5.3 Check Japanese line heights and button labels.
- [ ] 5.4 Check Japanese accessible names with a screen reader.

## 6. Verification

- [ ] 6.1 Run `npm test`.
- [ ] 6.2 Run `npm run typecheck`.
- [ ] 6.3 Run `npm run build`.
- [ ] 6.4 Verify English and Japanese switching in Playwright.
- [ ] 6.5 Verify language persistence and reset behavior.
- [ ] 6.6 Run `openspec validate --all`.
