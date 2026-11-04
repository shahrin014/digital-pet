# localization Specification

## Purpose
Defines the supported languages, the default language, the language selector, persistence, message coverage, and locale-aware presentation.

## Requirements

### Requirement: Supported languages and default

The app SHALL support Japanese (`ja`) and English (`en`). Japanese SHALL be the default language for first-time players and for saved preferences without a language. English SHALL be the second language.

#### Scenario: First launch

- **GIVEN** no saved language exists
- **WHEN** the app opens
- **THEN** the interface is displayed in Japanese
- **AND** the document language is `ja`

#### Scenario: Existing preferences without a language

- **GIVEN** preferences were saved before localization existed
- **WHEN** the app opens
- **THEN** the interface is displayed in Japanese

#### Scenario: Saved English

- **GIVEN** the saved language is English
- **WHEN** the app opens
- **THEN** the interface is displayed in English
- **AND** the document language is `en`

### Requirement: Language selector

The app SHALL provide a Language section in Settings with the options 日本語 and English, each written in its own language. The currently selected language SHALL be indicated. Changing the language SHALL apply immediately without a reload, persist, and update the document language.

#### Scenario: Switch to English

- **GIVEN** the app is displaying Japanese
- **WHEN** the player selects English in Settings
- **THEN** the interface switches to English immediately
- **AND** the saved language becomes English
- **AND** the document language becomes `en`

#### Scenario: Switch to Japanese

- **GIVEN** the app is displaying English
- **WHEN** the player selects 日本語 in Settings
- **THEN** the interface switches to Japanese immediately
- **AND** the saved language becomes Japanese

#### Scenario: Keyboard selection

- **GIVEN** the player uses only the keyboard
- **WHEN** the Language section is focused
- **THEN** both language options are reachable and operable
- **AND** the selected option is announced

### Requirement: Message coverage

All user-facing text SHALL come from Japanese and English message dictionaries, including navigation, care actions, need labels, validation, errors, reminders, install guidance, settings, and animation flows. Pet names and other player-authored text SHALL remain unchanged.

#### Scenario: No untranslated interface text

- **GIVEN** the app is displaying English
- **WHEN** the player visits the main screen, Settings, the animation dialog, and the install banner
- **THEN** all interface text is in English

#### Scenario: Action messages are localized

- **GIVEN** the app is displaying Japanese
- **WHEN** the player feeds the pet or performs a blocked action
- **THEN** the result message is in Japanese

#### Scenario: Error messages are localized

- **GIVEN** the app is displaying Japanese
- **WHEN** an adoption, storage, notification, install, or animation error is shown
- **THEN** the message is in Japanese
- **AND** any file name or pet name remains unchanged

### Requirement: Language persistence

The selected language SHALL be stored with preferences and restored on reload and offline launch. Resetting the pet SHALL preserve the language. Deleting the local database SHALL reset the language to Japanese.

#### Scenario: Language survives reload

- **GIVEN** the player selected English
- **WHEN** the app is reloaded
- **THEN** the interface remains in English

#### Scenario: Reset keeps the language

- **GIVEN** the player is using English and resets the pet
- **WHEN** the adoption flow is shown
- **THEN** the interface remains in English

#### Scenario: Delete local data resets the language

- **GIVEN** the player is using English
- **WHEN** the player deletes the local database and adopts a new pet
- **THEN** the interface is displayed in Japanese

### Requirement: Missing translation fallback

The Japanese and English dictionaries SHALL contain the same message keys. If a message is missing at runtime, the app SHALL fall back to Japanese rather than showing a blank string or a raw key.

#### Scenario: Missing English key

- **GIVEN** an English message key is missing
- **WHEN** the message is displayed
- **THEN** the Japanese message is shown

#### Scenario: Key parity test

- **WHEN** the test suite runs
- **THEN** it fails if the Japanese and English dictionaries have different keys

### Requirement: Locale-aware formatting

The app SHALL set the document language to `ja` or `en` and SHALL use `Intl` for locale-sensitive numbers and dates where they are displayed.

#### Scenario: Document language updates

- **GIVEN** the player switches languages
- **WHEN** the interface changes
- **THEN** the `lang` attribute on the document element matches the active language

#### Scenario: Localized number output

- **GIVEN** the active language is Japanese
- **WHEN** a locale-sensitive number is displayed
- **THEN** it is formatted with the Japanese locale

### Requirement: Japanese typography and layout

Japanese text SHALL use a font stack with Japanese system fonts and SHALL remain readable without clipping or horizontal scrolling at a 320 CSS pixel viewport.

#### Scenario: Japanese phone layout

- **GIVEN** the interface is in Japanese
- **WHEN** the app is viewed at 320 CSS pixels wide
- **THEN** no horizontal scrolling is required
- **AND** labels, buttons, and messages are not clipped

#### Scenario: Japanese screen-reader labels

- **GIVEN** the interface is in Japanese
- **WHEN** assistive technology reads a control
- **THEN** its accessible name is in Japanese
