# Animation Packs

Digital Pet can replace the built-in pet animation with a custom pack. A pack is
a ZIP archive with the `.petpack` extension containing a manifest and one static
SVG per frame.

## Pack layout

```text
my-pet.petpack
├── manifest.json
└── frames/
    ├── idle/
    │   ├── 0.svg
    │   ├── 1.svg
    │   ├── 2.svg
    │   └── 3.svg
    ├── feed/
    │   ├── 0.svg
    │   └── ...
    ├── play/
    ├── sleep/
    ├── wake/
    └── walk/
```

Rules:

- The archive contains exactly `manifest.json` and the six frame directories.
- Each animation directory contains exactly `0.svg` through
  `{frames - 1}.svg`.
- Every frame is a static SVG with `viewBox="0 0 frameWidth frameHeight"`.
- The pet's ground contact belongs at the bottom-center of the viewBox.
- No extra files or directories.

Build the archive with the manifest at the root:

```bash
cd my-pack
zip -r ../my-pet.petpack manifest.json frames
```

## Manifest

```json
{
  "formatVersion": 1,
  "name": "My Pet",
  "description": "A hand-drawn fox with a bouncy walk.",
  "frameWidth": 128,
  "frameHeight": 128,
  "animations": {
    "idle": { "frames": 4, "fps": 8 },
    "feed": { "frames": 6, "fps": 12 },
    "play": { "frames": 8, "fps": 12 },
    "sleep": { "frames": 4, "fps": 4 },
    "wake": { "frames": 4, "fps": 10 },
    "walk": { "frames": 6, "fps": 10 }
  }
}
```

| Field | Required | Rule |
| --- | --- | --- |
| `formatVersion` | yes | `1` |
| `name` | yes | 1–32 characters |
| `description` | no | at most 120 characters |
| `frameWidth` | yes | integer 32–512 |
| `frameHeight` | yes | integer 32–512 |
| `animations` | yes | exactly the six states above |
| `frames` | yes | integer 1–24 |
| `fps` | no | integer 4–30; defaults below |

Default FPS: `idle` 8, `feed` 12, `play` 12, `sleep` 4, `wake` 10, `walk` 10.

## Frame rules

- Frames play left to right from `0.svg`.
- Use the exact same viewBox in every frame, for example
  `viewBox="0 0 128 128"`.
- Keep the pet's feet at the bottom-center so frames do not jitter.
- Use transparent backgrounds.
- Keep frames static. The app controls timing.

## Safety rules

The app rejects frames containing:

- `<script>` or event-handler attributes
- `<foreignObject>` or embedded `<image>` elements
- external `href` or `xlink:href` references
- CSS animation, `@keyframes`, or `@import`
- SVG animation elements such as `<animate>`, `<animateTransform>`, or `<set>`
- `javascript:` URLs

Internal fragment references such as `fill="url(#gradient)"` or
`href="#shape"` are allowed.

## Limits

- Pack size: 5 MB compressed, 20 MB uncompressed
- Frame size: 32 × 32 to 512 × 512 SVG units
- Frames per animation: 1–24
- FPS: 4–30
- One active custom pack per pet

## Uploading

1. Open **Settings → Pet appearance**.
2. Choose **Upload animation pack**.
3. Select a `.petpack` file.
4. Review the six animation previews.
5. Choose **Apply animation pack**.

The pack is stored locally in IndexedDB and works offline after it is applied.
Use **Remove custom animation** in the same dialog to return to the built-in
species animation.

## Reduced motion

When the device requests reduced motion, the app shows frame 0 of each animation
and does not advance frames. Uploading and applying a pack still works.

## Sample

The app ships a small sample pack at `/samples/example.petpack`. It is also
available from the animation dialog.
