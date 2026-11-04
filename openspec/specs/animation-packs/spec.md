# animation-packs Specification

## Purpose
Defines the `.petpack` container, manifest, SVG frame-set layout, validation limits, upload and preview flow, local storage, fallback, and accessibility for player-supplied pet animations.

## Requirements

### Requirement: Pack container

A custom animation pack SHALL be a ZIP archive with the `.petpack` extension containing exactly one `manifest.json` and one `frames/` directory. The `frames/` directory SHALL contain exactly the `idle`, `feed`, `play`, `sleep`, `wake`, and `walk` subdirectories. The app SHALL reject archives that cannot be read as ZIP files, contain extra files or directories, are larger than 5 MB compressed, or are larger than 20 MB uncompressed.

#### Scenario: Valid pack container

- **GIVEN** a `.petpack` with `manifest.json` and the six frame directories
- **WHEN** the player selects the file
- **THEN** the app accepts it for manifest and frame validation

#### Scenario: Missing frame directory

- **GIVEN** a `.petpack` without a `walk` directory
- **WHEN** the pack is validated
- **THEN** the app rejects it with an error naming `walk`
- **AND** no appearance changes

#### Scenario: Extra files

- **GIVEN** a `.petpack` containing a README in addition to the required files
- **WHEN** the pack is validated
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

Each animation SHALL declare `frames` from 1 to 24 and MAY declare `fps` as an integer from 4 to 30. When `fps` is omitted, the app SHALL use the animation's default: `idle` 8, `feed` 12, `play` 12, `sleep` 4, `wake` 10, and `walk` 10.

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

### Requirement: Frame file set

Each animation directory SHALL contain exactly the number of frames declared in the manifest, named `0.svg` through `{frames - 1}.svg`. The app SHALL reject missing, extra, non-SVG, or incorrectly numbered frame files.

#### Scenario: Valid frame set

- **GIVEN** `idle` declares 4 frames
- **WHEN** `frames/idle/` contains `0.svg`, `1.svg`, `2.svg`, and `3.svg`
- **THEN** the frame set is accepted

#### Scenario: Missing frame

- **GIVEN** `idle` declares 4 frames and `frames/idle/3.svg` is missing
- **WHEN** the pack is validated
- **THEN** the app rejects it with a missing-frame error naming `idle` and `3.svg`

#### Scenario: Extra frame

- **GIVEN** `idle` declares 4 frames and `frames/idle/4.svg` exists
- **WHEN** the pack is validated
- **THEN** the app rejects it with an extra-frame error

#### Scenario: Invalid frame filename

- **GIVEN** `frames/idle/` contains `walk-0.svg` instead of `0.svg`
- **WHEN** the pack is validated
- **THEN** the app rejects it with a filename error

#### Scenario: Non-SVG frame

- **GIVEN** `frames/idle/0.png` is supplied instead of `0.svg`
- **WHEN** the pack is validated
- **THEN** the app rejects it as an unsupported frame format

### Requirement: Frame viewBox and anchor

Every frame SVG SHALL have a root `viewBox` of `0 0 frameWidth frameHeight` and SHALL place the pet's ground contact at the bottom-center of that viewBox.

#### Scenario: Consistent frame viewBox

- **GIVEN** every frame SVG uses the declared `viewBox`
- **WHEN** the pack is validated
- **THEN** the frames are accepted

#### Scenario: Mismatched frame viewBox

- **GIVEN** one frame SVG uses a different `viewBox` size or origin
- **WHEN** the pack is validated
- **THEN** the app rejects it with a viewBox error naming the frame

#### Scenario: Ground anchor is consistent

- **GIVEN** all frames use the declared viewBox and bottom-center anchor
- **WHEN** the animations play
- **THEN** the pet's feet remain aligned across frames

### Requirement: SVG isolation

The app SHALL render each SVG frame as an isolated image, SHALL rasterize it before display, and SHALL NOT execute scripts or load external resources from it.

#### Scenario: Frames are rasterized before display

- **GIVEN** a valid SVG frame set
- **WHEN** the player previews or applies the pack
- **THEN** each SVG is decoded as an isolated image
- **AND** playback uses rasterized frame bitmaps

#### Scenario: SVG script rejected

- **GIVEN** a frame SVG containing a `<script>` element
- **WHEN** the pack is validated
- **THEN** the app rejects it as unsafe
- **AND** no script is executed

### Requirement: SVG content restrictions

The app SHALL reject any frame SVG containing event-handler attributes, `<foreignObject>`, external `href` or `xlink:href` references, embedded `<image>` elements, CSS animation declarations, or SVG animation elements such as `<animate>`, `<animateTransform>`, or `<set>`.

#### Scenario: SVG external reference rejected

- **GIVEN** a frame SVG that references an external image or URL
- **WHEN** the pack is validated
- **THEN** the app rejects it as unsafe
- **AND** no network request is made

#### Scenario: SVG animation rejected

- **GIVEN** a frame SVG containing `<animate>` or `<set>`
- **WHEN** the pack is validated
- **THEN** the app rejects it because frames must be static

#### Scenario: Safe vector frame accepted

- **GIVEN** a frame SVG that uses only static vector elements, internal fragment references, and no external resources
- **WHEN** the pack is validated
- **THEN** the app accepts it

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

- **GIVEN** a custom pack is recorded as active but one of its frames cannot be decoded
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

The app SHALL render the pack name and description as plain text, SHALL accept only SVG frame files, and SHALL NOT make network requests while validating, previewing, storing, or rendering a pack.

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

Upload and preview controls SHALL be keyboard operable and SHALL have accessible labels for every animation preview. When reduced motion is requested, previews and gameplay SHALL show the first frame instead of advancing frames.

#### Scenario: Keyboard-only pack preview

- **GIVEN** the player uses only the keyboard
- **WHEN** the preview opens
- **THEN** every animation preview and the apply/cancel controls are reachable
- **AND** each preview has an accessible name

#### Scenario: Reduced-motion preview

- **GIVEN** the device has `prefers-reduced-motion: reduce`
- **WHEN** the player previews a pack
- **THEN** each animation shows frame 0
- **AND** applying the pack still works
