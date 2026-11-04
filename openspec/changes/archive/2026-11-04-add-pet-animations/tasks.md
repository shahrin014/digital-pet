# Tasks

## 1. Animation runtime

- [x] 1.1 Add animation-state types and timing constants for `idle`, `feed`, `play`, `sleep`, `wake`, and `walk`.
- [x] 1.2 Derive the active animation from persistent activity plus transient action state.
- [x] 1.3 Clear transient animations on activity changes and expiry.
- [x] 1.4 Add reduced-motion mapping to a single static frame.
- [x] 1.5 Add unit tests for state derivation, interruption, expiry, and reduced motion.
- [x] 1.6 Add a persisted motion preference: follow device, always animate, or always reduce.

## 2. Built-in animations

- [x] 2.1 Implement the six keyframe tracks for fox.
- [x] 2.2 Implement the six keyframe tracks for cat.
- [x] 2.3 Implement the six keyframe tracks for bunny.
- [x] 2.4 Match the frame counts and cycle times in the `pet-animation` spec.
- [x] 2.5 Verify feeding, playing, waking, sleeping, walking, and idle visually.

## 3. Custom pack parser

- [x] 3.1 Add a ZIP reader and `.petpack` container validation.
- [x] 3.2 Validate the manifest schema, required states, frame counts, FPS, and frame dimensions.
- [x] 3.3 Validate the six animation directories and exactly `0.svg` through `{frames - 1}.svg`.
- [x] 3.4 Validate each frame's viewBox and bottom-center ground anchor.
- [x] 3.5 Reject unsafe SVG: scripts, event handlers, `foreignObject`, external references, embedded images, CSS animation, and SVG animation elements.
- [x] 3.6 Enforce compressed/uncompressed size limits and reject extra files or directories.
- [x] 3.7 Add unit tests for every container, manifest, frame-set, and SVG validation error.

## 4. Custom renderer

- [x] 4.1 Rasterize each SVG frame through an isolated image into a frame-sized bitmap.
- [x] 4.2 Render a custom pack with a canvas frame player that swaps the current bitmap.
- [x] 4.3 Implement loop and once playback from the manifest.
- [x] 4.4 Scale frames to fit the pet stage without distortion.
- [x] 4.5 Pause frame advancement when the document is hidden.
- [x] 4.6 Add accessible names and reduced-motion frame-0 rendering.
- [x] 4.7 Cache decoded frames and release bitmaps when the pack is replaced or removed.

## 5. Storage

- [x] 5.1 Add the IndexedDB animation-pack store and schema migration.
- [x] 5.2 Save, replace, load, and remove packs with the manifest and frame data.
- [x] 5.3 Decode stored frames and fall back to built-in art when decoding fails.
- [x] 5.4 Clear packs during **Delete local database**.
- [x] 5.5 Handle quota and storage errors without partial writes.

## 6. Upload and preview UI

- [x] 6.1 Add **Upload animation pack** to pet appearance settings.
- [x] 6.2 Show validation errors with the affected manifest field, animation, or frame file.
- [x] 6.3 Preview all six animations before applying.
- [x] 6.4 Support apply, cancel, replace, and remove.
- [x] 6.5 Make the flow keyboard and screen-reader accessible.
- [x] 6.6 Add the motion preference selector and reduced-motion notice to settings.

## 7. Documentation and samples

- [x] 7.1 Write `docs/animation-packs.md` with the manifest schema, directory layout, viewBox, and anchor rules.
- [x] 7.2 Add a sample `.petpack` with one SVG per frame.
- [x] 7.3 Update the README with the upload flow and limits.

## 8. Verification

- [x] 8.1 Run `npm test`.
- [x] 8.2 Run `npm run typecheck`.
- [x] 8.3 Run `npm run build`.
- [x] 8.4 Verify offline reload with an applied pack.
- [x] 8.5 Run `openspec validate --all`.
