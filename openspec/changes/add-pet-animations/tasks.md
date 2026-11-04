# Tasks

## 1. Animation runtime

- [ ] 1.1 Add animation-state types and timing constants for `idle`, `feed`, `play`, `sleep`, `wake`, and `walk`.
- [ ] 1.2 Derive the active animation from persistent activity plus transient action state.
- [ ] 1.3 Clear transient animations on activity changes and expiry.
- [ ] 1.4 Add reduced-motion mapping to a single static frame.
- [ ] 1.5 Add unit tests for state derivation, interruption, expiry, and reduced motion.

## 2. Built-in animations

- [ ] 2.1 Implement the six keyframe tracks for fox.
- [ ] 2.2 Implement the six keyframe tracks for cat.
- [ ] 2.3 Implement the six keyframe tracks for bunny.
- [ ] 2.4 Match the frame counts and cycle times in the `pet-animation` spec.
- [ ] 2.5 Verify feeding, playing, waking, sleeping, walking, and idle visually.

## 3. Custom pack parser

- [ ] 3.1 Add a ZIP reader and `.petpack` container validation.
- [ ] 3.2 Validate the manifest schema, required states, frame counts, FPS, and frame dimensions.
- [ ] 3.3 Validate raster and SVG sprite-sheet dimensions; reject animated raster images and unsafe SVG.
- [ ] 3.4 Enforce compressed/uncompressed size limits and reject extra files.
- [ ] 3.5 Add unit tests for every validation error.
- [ ] 3.6 Add tests for SVG script, external-reference, animation-element, and `foreignObject` rejection.

## 4. Custom renderer

- [ ] 4.1 Render a custom pack with a canvas sprite player.
- [ ] 4.2 Implement loop and once playback from the manifest.
- [ ] 4.3 Scale frames to fit the pet stage without distortion.
- [ ] 4.4 Pause frame advancement when the document is hidden.
- [ ] 4.5 Add accessible names and reduced-motion static frames.
- [ ] 4.6 Rasterize SVG sheets through an isolated image and reuse the same frame crop.

## 5. Storage

- [ ] 5.1 Add the IndexedDB animation-pack store and schema migration.
- [ ] 5.2 Save, replace, load, and remove packs.
- [ ] 5.3 Decode stored blobs and fall back to built-in art when decoding fails.
- [ ] 5.4 Clear packs during **Delete local database**.
- [ ] 5.5 Handle quota and storage errors without partial writes.

## 6. Upload and preview UI

- [ ] 6.1 Add **Upload animation pack** to pet appearance settings.
- [ ] 6.2 Show validation errors with the affected manifest field or state.
- [ ] 6.3 Preview all six animations before applying.
- [ ] 6.4 Support apply, cancel, replace, and remove.
- [ ] 6.5 Make the flow keyboard and screen-reader accessible.

## 7. Documentation and samples

- [ ] 7.1 Write `docs/animation-packs.md` with the manifest schema and atlas layout.
- [ ] 7.2 Add a sample `.petpack` or sample files.
- [ ] 7.3 Update the README with the upload flow and limits.

## 8. Verification

- [ ] 8.1 Run `npm test`.
- [ ] 8.2 Run `npm run typecheck`.
- [ ] 8.3 Run `npm run build`.
- [ ] 8.4 Verify offline reload with an applied pack.
- [ ] 8.5 Run `openspec validate --all`.
