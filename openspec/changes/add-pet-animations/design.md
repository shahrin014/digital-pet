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

Render custom packs with a `<canvas>` and `drawImage` using a source rectangle for each frame:

- The atlas is six rows: idle, feed, play, sleep, wake, walk.
- Row height is `frameHeight`; frame width is `frameWidth`.
- The player increments the frame at the manifest FPS, loops or stops at the end, and pauses when the document is hidden.
- Scale the frame to fit the pet stage while preserving aspect ratio.
- Under reduced motion, draw frame 0 and do not advance.

### Pack parsing and validation

Add `fflate` as a small dependency to read the `.petpack` ZIP in memory. Validate:

- ZIP signature and compressed/uncompressed size limits.
- Exactly `manifest.json` plus `spritesheet.png` or `spritesheet.webp`.
- Manifest schema, required states, frame counts, FPS, frame size, and atlas dimensions.
- Sprite sheet decodes as a static image; reject SVG, HTML, GIF, APNG, and animated WebP.
- Reject names/descriptions with markup; render them as text.

Validation runs before anything is persisted. The preview uses the same renderer as gameplay so timing and scaling are accurate.

### Storage

Bump the IndexedDB version to 2 and add an `animationPacks` object store keyed by pet id. Store `{ manifest, sheet: Blob, appliedAt }`. Keep at most one pack per pet; applying a new pack deletes the previous one in the same transaction. On load, decode the Blob into an `ImageBitmap`; revoke or close it when replaced.

If the pack cannot be read, fall back to the built-in animation and surface a non-blocking warning. Removing the pack deletes the record and returns to the built-in species art.

## Architecture Decisions

### Decision: Canvas for custom packs, SVG/CSS for built-ins

Canvas gives exact control over arbitrary frame counts and FPS. Keeping built-ins in SVG avoids bundling sprite sheets and preserves crisp scaling.

### Decision: One pack per pet

The MVP has one active pet. One active pack keeps the UI and storage simple and avoids a pack library without a management screen.

### Decision: Fall back per state, not per pack

If one animation is missing or fails at runtime, use the built-in animation for that state and keep the rest of the pack. This keeps the pet usable without silently discarding the whole appearance.

### Decision: No executable or animated image formats

Only static PNG/WebP sprite sheets are accepted. The app controls timing from the manifest, which makes reduced motion and frame validation possible.

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
keyframes        sprite player
   │                 │
   └────────┬────────┘
            ▼
      Pet stage render
```

## File Changes

- `src/game/animation.ts` — state derivation and timing constants.
- `src/game/animation.test.ts` — state and timing tests.
- `src/components/PetArt.tsx` — built-in keyframe tracks.
- `src/components/CustomPetRenderer.tsx` — canvas sprite player.
- `src/components/AnimationPackDialog.tsx` — upload, validate, preview, apply.
- `src/storage/animation-packs.ts` — IndexedDB storage and fallback.
- `src/styles.css` — animation keyframes and preview layout.
- `docs/animation-packs.md` — authoring guide and sample manifest.
- `public/samples/example.petpack` — optional sample pack.

## Error Handling

- Invalid pack: keep the dialog open, list field-level errors, and change nothing.
- Storage quota: keep the current appearance, show an error, and do not leave a partial record.
- Corrupt stored pack: fall back to built-in art for affected states and warn once.
- Missing custom animation: fall back to the built-in animation for that state.
- Blocked action: no animation; show the existing reason message.

## Testing Strategy

- Unit-test animation state derivation, transient expiry, interruption, and reduced-motion mapping.
- Unit-test manifest validation for every limit and error case.
- Test IndexedDB round-trip, replacement, removal, and corrupt-pack fallback.
- Use deterministic timers for frame tests.
- Manual or E2E checks for upload, preview, apply, cancel, replace, and offline reload.
- Accessibility checks for labels, keyboard flow, and reduced motion.
