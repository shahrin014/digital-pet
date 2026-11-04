# Animation Packs Specification

## Purpose

Defines the `.petpack` container, manifest, sprite-sheet layout, validation limits, upload and preview flow, local storage, fallback, and accessibility for player-supplied pet animations.

## ADDED Requirements

### Requirement: Pack container

A custom animation pack SHALL be a ZIP archive with the `.petpack` extension containing exactly `manifest.json` and one sprite sheet named `spritesheet.png` or `spritesheet.webp`. The app SHALL reject archives that cannot be read as ZIP files, contain additional files, are larger than 5 MB compressed, or are larger than 20 MB uncompressed.

#### Scenario: Valid pack container

- **GIVEN** a `.petpack` with `manifest.json` and `spritesheet.png`
- **WHEN** the player selects the file
- **THEN** the app accepts it for manifest and image validation

#### Scenario: Missing sprite sheet

- **GIVEN** a `.petpack` containing only `manifest.json`
- **WHEN** the player selects the file
- **THEN** the app rejects it with an error naming the missing sprite sheet
- **AND** no appearance changes

#### Scenario: Extra files

- **GIVEN** a `.petpack` containing a README in addition to the required files
- **WHEN** the player selects the file
- **THEN** the app rejects it with an error explaining the allowed files

#### Scenario: Oversized pack

- **GIVEN** a `.petpack` larger than 5 MB compressed
- **WHEN** the player selects the file
- **THEN** the app rejects it with a size-limit error

### Requirement: Manifest fields

The manifest SHALL be valid JSON with `formatVersion` equal to `1`, a `name` of 1–32 characters, an optional `description` of at most 120 characters, `frameWidth` and `frameHeight` integers from 32 to 512, and an `animations` object containing exactly `idle`, `feed`, `play`, `sleep`, `wake`, and `walk`.

#### Scenario: Valid manifest

- **GIVEN** a manifest with every required field and all six animation states
- **WHEN** the pack is validated
- **THEN** the manifest is accepted

#### Scenario: Missing animation state

- **GIVEN** a manifest that does not define `walk`
- **WHEN** the pack is validated
- **THEN** the app rejects it with an error naming `walk`
- **AND** no appearance changes

#### Scenario: Invalid frame size

- **GIVEN** a manifest with `frameWidth` of 16
- **WHEN** the pack is validated
- **THEN** the app rejects it with a frame-size error

#### Scenario: Malformed JSON

- **GIVEN** a manifest that is not valid JSON
- **WHEN** the pack is validated
- **THEN** the app reports a manifest parse error
- **AND** no appearance changes

### Requirement: Frame and FPS limits

Each animation SHALL declare `frames` from 1 to 24 and MAY declare `fps` from 4 to 30. When `fps` is omitted, the app SHALL use the animation's default: `idle` 8, `feed` 12, `play` 12, `sleep` 4, `wake` 10, and `walk` 10.

#### Scenario: Default FPS applied

- **GIVEN** a manifest where every animation declares `frames` and omits `fps`
- **WHEN** the pack is validated
- **THEN** the default FPS values are applied
- **AND** the pack is accepted

#### Scenario: Too many frames

- **GIVEN** a manifest where `play` declares 25 frames
- **WHEN** the pack is validated
- **THEN** the app rejects it with a frame-limit error

#### Scenario: FPS out of range

- **GIVEN** a manifest where `play` declares 2 FPS
- **WHEN** the pack is validated
- **THEN** the app rejects it with an FPS-limit error

### Requirement: Sprite sheet layout

The sprite sheet SHALL be a static PNG or WebP image with these fixed rows:

| Row | Animation |
| --- | --- |
| 0 | `idle` |
| 1 | `feed` |
| 2 | `play` |
| 3 | `sleep` |
| 4 | `wake` |
| 5 | `walk` |

The sheet width SHALL be at least `frameWidth × max(frames)` and at most 4096 pixels. The sheet height SHALL be at least `frameHeight × 6` and at most 4096 pixels. Frames SHALL be laid out left to right starting at column 0 of their row. Extra transparent space MAY be ignored.

#### Scenario: Atlas matches the manifest

- **GIVEN** a 128 × 128 frame size and a maximum frame count of 8
- **WHEN** the pack is validated
- **THEN** the sprite sheet is accepted when it is at least 1024 pixels wide and 768 pixels tall

#### Scenario: Atlas too small

- **GIVEN** a sprite sheet narrower than `frameWidth × max(frames)`
- **WHEN** the pack is validated
- **THEN** the app rejects it with an atlas-dimension error

#### Scenario: Animated image rejected

- **GIVEN** a sprite sheet that is an animated PNG or animated WebP
- **WHEN** the pack is validated
- **THEN** the app rejects it because the sprite sheet must be static

#### Scenario: Unsupported image format

- **GIVEN** a pack whose sprite sheet is SVG, GIF, HTML, or JavaScript renamed to `.png`
- **WHEN** the pack is validated
- **THEN** the app rejects it as an unsupported image
- **AND** no image content is executed

### Requirement: Upload and preview

The app SHALL provide an **Upload animation pack** action in pet appearance settings. After validation, the app SHALL preview all six animations at their declared timing and display the pack name, frame size, and per-animation frame counts before applying. The player SHALL be able to apply or cancel, and cancelling SHALL leave the current appearance unchanged.

#### Scenario: Upload, preview, and apply

- **GIVEN** a valid `.petpack`
- **WHEN** the player selects it and confirms apply
- **THEN** the preview shows all six animations
- **AND** the pack becomes the active pet's animation set
- **AND** every activity uses the custom animation

#### Scenario: Cancel preview

- **GIVEN** the preview is open
- **WHEN** the player cancels
- **THEN** the current appearance remains unchanged
- **AND** no pack data is stored

#### Scenario: Replace an existing pack

- **GIVEN** a custom animation pack is active
- **WHEN** the player applies a different valid pack
- **THEN** the new pack replaces the old one
- **AND** the old pack data is deleted

#### Scenario: Invalid pack leaves current appearance

- **GIVEN** a custom animation pack is active
- **WHEN** the player selects an invalid pack
- **THEN** the app lists the validation errors
- **AND** the current appearance remains unchanged

### Requirement: Local storage and offline use

The app SHALL store the active pack locally in IndexedDB and SHALL restore it after reload, app restart, and offline launch. Pack data SHALL NOT be sent to a server. Removing the pack SHALL delete its stored data and return the pet to its built-in species animation.

#### Scenario: Pack survives reload and offline use

- **GIVEN** a valid pack has been applied
- **WHEN** the app is reloaded with the network disabled
- **THEN** the custom animations are restored
- **AND** all activities animate

#### Scenario: Remove the custom pack

- **GIVEN** a custom pack is active
- **WHEN** the player chooses remove
- **THEN** the stored pack is deleted
- **AND** the built-in species animation returns

#### Scenario: Pack is missing or corrupt

- **GIVEN** a custom pack is recorded as active but its image cannot be decoded
- **WHEN** the main game screen loads
- **THEN** the built-in animation is used
- **AND** a non-blocking warning explains that the custom pack could not be loaded

#### Scenario: Storage quota is exceeded

- **GIVEN** the device does not have enough space for the pack
- **WHEN** the player applies it
- **THEN** the app reports that the pack could not be saved
- **AND** the previous appearance remains active

#### Scenario: Delete local database removes packs

- **GIVEN** a custom pack is stored
- **WHEN** the player uses **Delete local database**
- **THEN** the pack is deleted with the rest of the local data

### Requirement: Pack safety

The app SHALL render the pack name and description as plain text, SHALL reject executable or animated image formats, and SHALL NOT make network requests while validating, previewing, storing, or rendering a pack.

#### Scenario: Markup in pack metadata

- **GIVEN** a manifest whose name contains HTML markup
- **WHEN** the name is displayed in the preview or settings
- **THEN** the markup is shown literally as text
- **AND** it is not executed

#### Scenario: No network access

- **GIVEN** a pack is being validated and applied
- **WHEN** the device is offline
- **THEN** validation, preview, apply, and rendering still work

### Requirement: Pack accessibility and reduced motion

Upload and preview controls SHALL be keyboard operable and SHALL have accessible labels for every animation preview. When reduced motion is requested, previews and gameplay SHALL show a single representative frame instead of advancing frames.

#### Scenario: Keyboard-only pack preview

- **GIVEN** the player uses only the keyboard
- **WHEN** the preview opens
- **THEN** every animation preview and the apply/cancel controls are reachable
- **AND** each preview has an accessible name

#### Scenario: Reduced-motion preview

- **GIVEN** the device has `prefers-reduced-motion: reduce`
- **WHEN** the player previews a pack
- **THEN** each animation shows a static representative frame
- **AND** applying the pack still works
