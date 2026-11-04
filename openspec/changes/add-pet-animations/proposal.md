# Proposal: Pet Activity Animations and Custom Animation Packs

## Why

The built-in pets currently change appearance with the awake, sleeping, and walking states, but the care actions themselves do not have distinct animations. Players also want to bring their own animated pet art. Without a shared frame-count and timing contract, built-in pets and player-supplied animations would behave inconsistently.

## What Changes

- Add six animation states: `idle`, `feed`, `play`, `sleep`, `wake`, and `walk`.
- Define exact default frame counts, frame durations, and loop behavior for each state.
- Play transient animations for feed, play, and wake; loop idle, sleep, and walk.
- Add a `.petpack` custom animation pack format containing a `manifest.json` and a frame set of one static SVG per frame.
- Define pack limits, validation rules, upload and preview flow, local storage, fallback, and removal.
- Respect reduced-motion preferences for built-in and custom animations, with an in-app motion preference that can follow the device, always animate, or always reduce motion.
- Add a pack authoring guide and a sample pack.

## Scope

In scope:

- Animation state machine and action-to-animation mapping.
- Built-in frame counts and timings for fox, cat, and bunny.
- Custom animation pack format and validation.
- Upload, preview, apply, replace, and remove flows.
- Local persistence and offline behavior.
- Reduced-motion and screen-reader behavior.
- Tests for frame timing, state transitions, validation, and storage.

Out of scope:

- Sharing or downloading packs from other players.
- A marketplace or monetization.
- Cloud storage or cross-device sync.
- Rigged or skeletal animation; packs are SVG frame sets.
- Raster PNG/WebP frame sets; v1 accepts SVG frames only.
- Per-frame sound effects.
- Custom behavior that changes pet needs or game balance.

## Approach

Keep the built-in species artwork in SVG/CSS and implement the six animation states with keyframe poses that match the frame table. Render custom packs with a small canvas frame player that advances through one SVG frame per file at the declared rate; each frame is validated, isolated, and rasterized before playback. Derive the active animation from the pet's persistent activity plus a short-lived transient action state. Store an active pack as a manifest and frame blobs in IndexedDB, keyed to the pet, and fall back to the built-in animation if a pack is missing or invalid.

## Impact

- New `pet-animation` capability: runtime state machine and built-in timings.
- New `animation-packs` capability: format, validation, upload, storage, fallback.
- `pet-ui`: rendering and accessibility updates.
- `pet-care`: transient action animations.
- Storage: new asset storage and schema migration.
- README and a new pack-authoring guide.

## Dependencies

- Complements the draft `add-custom-pets` proposal. That proposal covers custom appearance; this change owns the motion format and runtime.
- A future custom-pet uploader can reuse the `.petpack` format without changing the animation runtime.

## Open Questions

- Should packs be exportable as files from the app? Deferred; not required for v1.
- Should multiple packs be stored per pet? No; v1 keeps one active pack per pet.
- Should packs support multiple pet sizes? No; v1 scales one frame size to fit the stage.
- Should raster PNG/WebP frame sets be supported later? Deferred; v1 is SVG-only.
