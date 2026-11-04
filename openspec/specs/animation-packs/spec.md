# Animation Packs Specification

## Purpose

Defines how players select images for each activity, how the app converts them into SVG frames, and how those frames are validated, previewed, stored, restored, and removed.

## Requirements

### Requirement: Frame selection

The app SHALL provide six multi-select image inputs, one for each activity: `idle`, `feed`, `play`, `sleep`, `wake`, and `walk`. Each activity SHALL accept between 1 and 24 files. Selected files SHALL be ordered by filename using natural numeric sorting before frame indices are assigned.

#### Scenario: Valid selection

- **GIVEN** the player selects three images for `idle`
- **WHEN** the selection is prepared
- **THEN** the idle frames are accepted in filename order

#### Scenario: Natural filename ordering

- **GIVEN** the idle selection contains `10.png`, `2.png`, and `1.png`
- **WHEN** the selection is prepared
- **THEN** the frame order is `1.png`, `2.png`, `10.png`

#### Scenario: Empty activity

- **GIVEN** the player has not selected any images for `walk`
- **WHEN** the player requests a preview
- **THEN** the app reports that `walk` needs at least one frame
- **AND** no animation is applied

#### Scenario: Too many frames

- **GIVEN** the player selects 25 images for `play`
- **WHEN** the player requests a preview
- **THEN** the app reports that `play` accepts at most 24 frames
- **AND** no animation is applied

### Requirement: Quick custom pet upload

The app SHALL allow the player to select one image and use it as a single frame for all six activities. The image SHALL be traced and stored like any other frame, and per-activity frames MAY be overridden afterward.

#### Scenario: One image fills all activities

- **GIVEN** the player selects one image in the quick custom pet upload
- **WHEN** the selection is prepared
- **THEN** each activity uses that image as its single frame

#### Scenario: Quick upload preview

- **GIVEN** the quick custom pet image is selected
- **WHEN** the player requests a preview
- **THEN** all six activities are previewed using the image

#### Scenario: Override one activity

- **GIVEN** a quick custom pet image is selected
- **WHEN** the player selects different frames for `play`
- **THEN** `play` uses the new frames
- **AND** the other activities keep the quick upload image

### Requirement: Current and uploaded animation preview

The app SHALL show a six-card preview grid in the pet appearance flow before the upload controls. The same grid SHALL preview both the currently active animations and the uploaded frames. A two-option control SHALL switch between **Current** and **Uploaded**, with **Current** shown first. The **Uploaded** option SHALL become available after the selection has been prepared. Each state SHALL use the active custom frames when present or the built-in species animation otherwise.

#### Scenario: Preview the built-in animation

- **GIVEN** the pet uses the built-in species animation
- **WHEN** the player opens the animation dialog
- **THEN** the six state cards show the built-in animation for idle, feed, play, sleep, wake, and walk
- **AND** the **Current** option is selected

#### Scenario: Preview the active custom animation

- **GIVEN** a custom animation is active
- **WHEN** the player opens the animation dialog
- **THEN** the six state cards show the stored custom frames for each state
- **AND** the **Current** option is selected

#### Scenario: Uploaded frames use the same grid

- **GIVEN** the player has selected frames for every activity
- **WHEN** the player chooses **Preview changes**
- **THEN** the same six-card grid shows the uploaded frames
- **AND** the **Uploaded** option becomes selected
- **AND** the **Current** option remains available

#### Scenario: Switch back to the current animation

- **GIVEN** the uploaded preview is visible
- **WHEN** the player selects the **Current** option
- **THEN** the grid shows the currently active animations
- **AND** changing frames again returns the grid to the **Current** option

#### Scenario: Select an activity to edit

- **GIVEN** the preview grid is visible
- **WHEN** the player selects the `sleep` card
- **THEN** the `sleep` card is indicated as selected
- **AND** the frame editor targets `sleep`

#### Scenario: Preview from settings

- **GIVEN** the pet appearance settings are open
- **WHEN** the player chooses **Manage animation**
- **THEN** the animation dialog opens
- **AND** the preview grid is visible before the upload controls

#### Scenario: Reduced-motion preview

- **GIVEN** reduced motion is active
- **WHEN** the player previews the current or uploaded animations
- **THEN** each preview shows a static frame

### Requirement: Single image upload

The app SHALL provide one image upload control per activity. That same control SHALL accept SVG, PNG, JPEG, and WebP. The app SHALL NOT provide a separate SVG-only upload control. The app SHALL reject other file formats with an error naming the rejected file.

#### Scenario: One control accepts every supported format

- **GIVEN** the animation dialog is open
- **WHEN** the player opens the file picker for an activity
- **THEN** SVG, PNG, JPEG, and WebP are accepted by that same control
- **AND** no separate SVG-only upload control is shown

#### Scenario: Raster image accepted

- **GIVEN** the player selects a PNG, JPEG, or WebP image
- **WHEN** the selection is prepared
- **THEN** the image is accepted for conversion

#### Scenario: SVG accepted

- **GIVEN** the player selects a safe SVG image
- **WHEN** the selection is prepared
- **THEN** the image is accepted for conversion

#### Scenario: Unsupported format

- **GIVEN** the player selects a GIF or an unknown file type
- **WHEN** the selection is prepared
- **THEN** the app rejects it with an unsupported-format error

### Requirement: Frame normalization

The app SHALL render every frame into a 512 × 512 canvas with contain scaling, bottom-center alignment, and a transparent background. Raster inputs SHALL be normalized this way before tracing. SVG inputs SHALL use the same fitting when rendered.

#### Scenario: Raster image is normalized

- **GIVEN** a 300 × 200 PNG
- **WHEN** it is converted
- **THEN** the result is a 512 × 512 frame
- **AND** the image is contained without distortion
- **AND** its bottom edge is aligned to the bottom of the frame

#### Scenario: SVG is fitted to the frame

- **GIVEN** a safe SVG with a non-square viewBox
- **WHEN** it is rendered
- **THEN** it is contained in a 512 × 512 frame without distortion
- **AND** its bottom edge is aligned to the bottom of the frame

#### Scenario: Transparency is preserved

- **GIVEN** an image with transparent pixels
- **WHEN** it is converted
- **THEN** the unused frame area remains transparent

### Requirement: Raster-to-SVG tracing

Before saving a raster input, the app SHALL trace its normalized frame into SVG paths using a client-side vectorizer. The app SHALL NOT embed the raster as an `<image>` element or data URL.

#### Scenario: Raster frame becomes SVG paths

- **GIVEN** a PNG frame
- **WHEN** it is prepared for storage
- **THEN** the app creates an SVG document with vector path elements
- **AND** the SVG does not contain an embedded raster image

#### Scenario: Stored raster frame is vector SVG

- **GIVEN** a converted raster frame
- **WHEN** it is stored
- **THEN** the stored frame contains SVG paths
- **AND** the original raster image is not stored separately

### Requirement: Direct SVG storage

A safe SVG input SHALL be stored unchanged. It SHALL NOT be rasterized and re-traced before storage.

#### Scenario: Safe SVG is stored as-is

- **GIVEN** a safe SVG image is selected through the shared upload control
- **WHEN** it is prepared for storage
- **THEN** the stored frame keeps the original SVG markup
- **AND** the app does not trace it into new paths

### Requirement: Source safety

The app SHALL reject SVG sources containing `<script>`, event-handler attributes, `<foreignObject>`, external `href` or `xlink:href` references, CSS animation or `@import`, or SVG animation elements such as `<animate>`, `<animateTransform>`, or `<set>`. Embedded raster data URLs SHALL be allowed.

#### Scenario: Unsafe SVG rejected

- **GIVEN** an SVG source containing a `<script>` element
- **WHEN** the selection is prepared
- **THEN** the app rejects it as unsafe
- **AND** no script is executed

#### Scenario: External reference rejected

- **GIVEN** an SVG source that references an external URL
- **WHEN** the selection is prepared
- **THEN** the app rejects it as unsafe
- **AND** no network request is made

#### Scenario: Embedded image allowed

- **GIVEN** an SVG source containing an embedded `data:image/png` reference
- **WHEN** the selection is prepared
- **THEN** the source is accepted for conversion

### Requirement: Animation name and FPS

The app SHALL require an animation name of 1–32 characters and an integer FPS from 4 to 30 for every activity. Defaults SHALL be `idle` 8, `feed` 12, `play` 12, `sleep` 4, `wake` 10, and `walk` 10.

#### Scenario: Default FPS values

- **GIVEN** the player has not changed the FPS fields
- **WHEN** the frames are prepared
- **THEN** each activity uses its default FPS

#### Scenario: Custom FPS

- **GIVEN** the player sets `play` to 20 FPS
- **WHEN** the frames are prepared
- **THEN** the preview uses 20 FPS for `play`

#### Scenario: Invalid name

- **GIVEN** the animation name is empty or longer than 32 characters
- **WHEN** the player requests a preview
- **THEN** the app reports a name error
- **AND** no animation is applied

#### Scenario: Invalid FPS

- **GIVEN** an activity is set to 2 FPS
- **WHEN** the player requests a preview
- **THEN** the app reports an FPS error
- **AND** no animation is applied

### Requirement: Preview and apply

The app SHALL validate all six selections, convert the frames, and preview every activity before applying. The player SHALL be able to apply or cancel, and cancelling SHALL leave the current appearance unchanged.

#### Scenario: Preview all activities

- **GIVEN** all six activities have valid frames
- **WHEN** the player requests a preview
- **THEN** the app shows all six animations with their frame counts and FPS

#### Scenario: Apply the animation

- **GIVEN** a valid preview
- **WHEN** the player confirms apply
- **THEN** the custom animation becomes active for every activity

#### Scenario: Cancel leaves the current appearance

- **GIVEN** the preview is open
- **WHEN** the player cancels
- **THEN** the current animation remains unchanged
- **AND** no new frames are stored

#### Scenario: Conversion error leaves the current appearance

- **GIVEN** a custom animation is active
- **WHEN** a selected image cannot be decoded
- **THEN** the app lists the error with the source filename
- **AND** the current animation remains unchanged

### Requirement: Local storage and offline use

The app SHALL store the active SVG frames locally in IndexedDB and restore them after reload, app restart, and offline launch. Removing the animation SHALL delete the stored frames and return to the built-in species animation.

#### Scenario: Animation survives reload and offline use

- **GIVEN** a custom animation has been applied
- **WHEN** the app is reloaded with the network disabled
- **THEN** the custom animation is restored
- **AND** all activities animate

#### Scenario: Remove the custom animation

- **GIVEN** a custom animation is active
- **WHEN** the player chooses remove
- **THEN** the stored frames are deleted
- **AND** the built-in species animation returns

#### Scenario: Stored frames are corrupt

- **GIVEN** a custom animation is recorded as active but a frame cannot be decoded
- **WHEN** the main game screen loads
- **THEN** the built-in animation is used
- **AND** a non-blocking warning explains that the custom animation could not be loaded

#### Scenario: Storage quota is exceeded

- **GIVEN** the device does not have enough space for the frames
- **WHEN** the player applies the animation
- **THEN** the app reports that the animation could not be saved
- **AND** the previous appearance remains active

#### Scenario: Delete local database removes frames

- **GIVEN** a custom animation is stored
- **WHEN** the player uses **Delete local database**
- **THEN** the frames are deleted with the rest of the local data

### Requirement: Safety and privacy

The app SHALL render the animation name as plain text, SHALL NOT send selected images or converted frames to a server, and SHALL NOT execute source content.

#### Scenario: Markup in the animation name

- **GIVEN** an animation name containing HTML markup
- **WHEN** the name is displayed
- **THEN** the markup is shown literally as text
- **AND** it is not executed

#### Scenario: No network access

- **GIVEN** the player is offline
- **WHEN** frames are selected, converted, previewed, and applied
- **THEN** the entire flow works without a network request

### Requirement: Accessibility and reduced motion

The frame inputs, preview, apply, and remove controls SHALL be keyboard operable and SHALL have accessible labels. When reduced motion is active, previews and gameplay SHALL show frame 0 instead of advancing frames.

#### Scenario: Keyboard-only frame selection

- **GIVEN** the player uses only the keyboard
- **WHEN** the animation dialog is open
- **THEN** every activity's file input, FPS field, preview, and apply control is reachable
- **AND** each control has an accessible name

#### Scenario: Reduced-motion preview

- **GIVEN** reduced motion is active
- **WHEN** the player previews the animation
- **THEN** each activity shows frame 0
- **AND** applying the animation still works
