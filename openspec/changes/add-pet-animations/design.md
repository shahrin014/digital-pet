# Design: Pet Activity Animations and Custom Animation Packs

## Technical Approach

### Animation state machine

Derive one animation state from two inputs:

1. The persistent pet activity: `awake` → `idle`, `sleeping` → `sleep`, `walking` → `walk`.
2. An optional transient action: `feed`, `play`, or `wake`.

A transient state overrides the persistent state for its declared cycle, then clears. A successful action sets the transient state; a blocked action does not. Persistent activity changes clear any transient state immediately. Starting a walk or falling asleep wins over a transient animation.

### Built-in rendering

The built-in species remain inline SVG. Each of the six states gets a CSS keyframe track with the exact frame count and timing in the `pet-animation` spec. A "frame" is a distinct keyframe pose; for example, idle has four poses and the track runs in 500 ms. Use `steps()`-style timing or explicit keyframe percentages so the number of poses is deterministic.

### Custom pack rendering

Custom packs use one SVG per frame in a fixed directory layout:

```text
.petpack
├── manifest.json
└── frames/
    ├── idle/
    │   ├── 0.svg
    │   ├── 1.svg
    │   └── ...
    ├── feed/
    ├── play/
    ├── sleep/
    ├── wake/
    └── walk/
```

At load:

1. Read and validate the ZIP and manifest.
2. Validate every frame's path, count, filename, viewBox, and SVG safety rules.
3. Rasterize each SVG through an isolated image to a frame-sized bitmap.
4. Cache the bitmaps in memory and draw the current frame to a canvas.
5. Advance frames at the manifest FPS, loop or stop at the end, and pause when the document is hidden.
6. Under reduced motion, draw frame 0 and do not advance.

Every frame uses `viewBox="0 0 frameWidth frameHeight"` and places the pet's ground contact at the bottom-center of that box, so frames do not jitter between poses.

### Pack parsing and validation

Add `fflate` as a small dependency to read the `.petpack` ZIP in memory. Validate:

- ZIP signature and compressed/uncompressed size limits.
- Exactly `manifest.json` plus the six `frames/<state>/` directories.
- Manifest schema, required states, frame counts, FPS, and frame size.
- Exactly `0.svg` through `{frames - 1}.svg` in each animation directory.
- Each SVG has the declared viewBox and bottom-center ground anchor.
- Each SVG is static and free of scripts, event handlers, `foreignObject`, external references, embedded `<image>` elements, CSS animation, and SVG animation elements.
- No extra files or directories.

Validation runs before anything is persisted. The preview uses the same renderer as gameplay so timing and scaling are accurate.

### Storage

Bump the IndexedDB version to 2 and add an `animationPacks` object store keyed by pet id. Store `{ manifest, frames: Map<string, Blob>, appliedAt }`. Keep at most one pack per pet; applying a new pack deletes the previous one in the same transaction. On load, decode each frame Blob into an `ImageBitmap` and cache them. Close or discard bitmaps when replaced.

If the pack cannot be read, fall back to the built-in animation and surface a non-blocking warning. Removing the pack deletes the record and returns to the built-in species art.

## Architecture Decisions

### Decision: SVG-only frame sets for v1

The custom pack format uses one static SVG per frame rather than a raster sprite sheet. This matches the built-in vector art, keeps assets crisp, and lets authors edit frames individually. Raster packs can be added later as a separate format version.

### Decision: One file per frame

One SVG per frame keeps the authoring model obvious and makes validation simple: count files, check names, check viewBox, check safety. A sprite sheet would require cropping and a second coordinate system.

### Decision: Rasterize SVG before playback

SVG files are loaded as isolated images and rasterized to frame-sized bitmaps. This prevents scripts and external resource loads, gives deterministic frame timing, and makes reduced-motion handling trivial.

### Decision: One pack per pet

The MVP has one active pet. One active pack keeps the UI and storage simple and avoids a pack library without a management screen.

### Decision: Fall back per state, not per pack

If one animation is missing or fails at runtime, use the built-in animation for that state and keep the rest of the pack. This keeps the pet usable without silently discarding the whole appearance.

## Data Flow

```text
Pet activity + transient action
            │
            ▼
     animation state
            │
   ┌────────┴────────┐
   ▼                 ▼
Built-in SVG     Custom canvas
keyframes        frame player
   │                 │
   └────────┬────────┘
            ▼
      Pet stage render
```

## File Changes

- `src/game/animation.ts` — state derivation and timing constants.
- `src/game/animation.test.ts` — state and timing tests.
- `src/components/PetArt.tsx` — built-in keyframe tracks.
- `src/components/CustomPetRenderer.tsx` — canvas frame player.
- `src/components/AnimationPackDialog.tsx` — upload, validate, preview, apply.
- `src/storage/animation-packs.ts` — IndexedDB storage and fallback.
- `src/styles.css` — animation keyframes and preview layout.
- `docs/animation-packs.md` — authoring guide and sample frame set.
- `public/samples/example.petpack` — optional sample pack.

## Error Handling

- Invalid pack: keep the dialog open, list field-level errors, and change nothing.
- Storage quota: keep the current appearance, show an error, and do not leave a partial record.
- Corrupt stored pack: fall back to built-in art for affected states and warn once.
- Missing custom frame: treat the affected animation as invalid and fall back to the built-in animation.
- Blocked action: no animation; show the existing reason message.

## Testing Strategy

- Unit-test animation state derivation, transient expiry, interruption, and reduced-motion mapping.
- Unit-test manifest and frame-set validation for every limit and error case.
- Test IndexedDB round-trip, replacement, removal, and corrupt-pack fallback.
- Use deterministic timers for frame tests.
- Manual or E2E checks for upload, preview, apply, cancel, replace, and offline reload.
- Accessibility checks for labels, keyboard flow, and reduced motion.
