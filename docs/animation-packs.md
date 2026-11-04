# Animation Frames

Digital Pet can replace the built-in pet animation with your own frames. There
is no ZIP or manifest file: open **Settings → Pet appearance → Upload animation
frames**, then select images for each activity.

## Quick custom pet

Choose one image in **Quick custom pet** to use it as a single frame for all six
activities. You can then override individual activities in the frames section.

## Preview the current animation

Before uploading anything, **Preview animation** shows the currently active
animation. Switch between the six states and replay the preview. This works for
both built-in and custom animations.

## Activities

Choose 1–24 images for each of:

- `idle`
- `feed`
- `play`
- `sleep`
- `wake`
- `walk`

Frames are sorted by filename using natural order, so name them in playback
order:

```text
0.png
1.png
2.png
10.png
```

## Accepted images

- SVG
- PNG
- JPEG
- WebP

Each image is normalized to a **512 × 512** frame:

- contain scaling, no distortion
- bottom-center alignment
- transparent background

The browser then traces the normalized raster into SVG paths with
[`imagetracerjs`](https://github.com/jankovicsandras/imagetracerjs) and saves
that SVG frame locally. This is an approximate vector conversion, not a
pixel-perfect trace.

## FPS

Each activity has an editable FPS value from 4 to 30. Defaults:

| Activity | Default FPS |
| --- | --- |
| `idle` | 8 |
| `feed` | 12 |
| `play` | 12 |
| `sleep` | 4 |
| `wake` | 10 |
| `walk` | 10 |

## Limits

- 1–24 frames per activity
- 4–30 FPS per activity
- 20 MB maximum per source image
- 20 MB maximum total converted frames
- 512 × 512 output frame

## Safety

SVG sources are checked before conversion. The app rejects scripts, event
handlers, `foreignObject`, external references, CSS animation/imports, and SVG
animation elements. Embedded raster data URLs are allowed.

Raster images are decoded and re-encoded on a canvas, which strips metadata.
Nothing is uploaded to a server, and the converted frames are stored in
IndexedDB on the device.

## Preview and apply

1. Select frames for all six activities.
2. Set the animation name and FPS values.
3. Choose **Preview animations**.
4. Review all six animations.
5. Choose **Apply animation**.

The animation is stored locally and works offline. Use **Remove custom
animation** in the same dialog to return to the built-in species animation.

## Reduced motion

When reduced motion is active, the app shows frame 0 and does not advance frames.
You can override the device setting with **Settings → Motion → Always animate**.
