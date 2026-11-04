# Tasks

## 1. Localization infrastructure

- [x] 1.1 Add typed Japanese and English message dictionaries.
- [x] 1.2 Add a locale store with `useLocale`, `useTranslation`, and `t(key, params)`.
- [x] 1.3 Add a key-parity test that fails when the dictionaries diverge.
- [x] 1.4 Update `<html lang>` when the locale changes.
- [x] 1.5 Add `locale: 'ja' | 'en'` to preferences, defaulting to Japanese.
- [x] 1.6 Normalize legacy preferences without a locale to Japanese.

## 2. Runtime messages

- [x] 2.1 Replace engine result sentences with message keys and parameters.
- [x] 2.2 Update engine tests to assert keys and parameters.
- [x] 2.3 Localize reminder and browser-notification text.
- [x] 2.4 Localize storage, adoption, and install errors.
- [x] 2.5 Localize animation conversion and validation errors.

## 3. Interface copy

- [x] 3.1 Localize the adoption screen and validation messages.
- [x] 3.2 Localize the main pet screen, needs, mood, and action controls.
- [x] 3.3 Localize Settings, install guidance, notifications, quiet hours, and motion.
- [x] 3.4 Localize the animation dialog, previews, and remove flow.
- [x] 3.5 Localize accessible names and live-region messages.
- [x] 3.6 Localize document titles and install-banner copy.

## 4. Language selector and navigation

- [x] 4.1 Add a Language section to Settings with 日本語 and English.
- [x] 4.2 Apply the language immediately and persist it.
- [x] 4.3 Keep the header gear as the only Settings entry point.
- [x] 4.4 Confirm no hamburger menu or drawer is introduced.
- [x] 4.5 Preserve the locale across pet reset and reset to Japanese after local database deletion.

## 5. Japanese layout

- [x] 5.1 Add a Japanese system-font stack.
- [x] 5.2 Check Japanese layout at 320 px without clipping or horizontal scrolling.
- [x] 5.3 Check Japanese line heights and button labels.
- [x] 5.4 Check Japanese accessible names in the accessibility tree.

## 6. Verification

- [x] 6.1 Run `npm test`.
- [x] 6.2 Run `npm run typecheck`.
- [x] 6.3 Run `npm run build`.
- [x] 6.4 Verify English and Japanese switching in Playwright.
- [x] 6.5 Verify language persistence and reset behavior.
- [x] 6.6 Run `openspec validate --all`.
