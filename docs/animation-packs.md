# Animation Frames

Digital Pet can replace the built-in pet animation with your own frames. There
is no ZIP or manifest file: open **Settings → Pet appearance → Manage
animation**, then select images for each activity.

## Quick custom pet

Select one image for an activity, then choose **Copy to all activities** to use
it as a single frame for all six activities. You can override individual
activities afterward.

## Preview all current animations

Open **Settings → Pet appearance → Manage animation**. The dialog shows the six
currently active animations together, so you can compare idle, feed, play,
sleep, wake, and walk at a glance. This works for both built-in and custom
animations. Select any card to edit that activity.

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

SVG files are used as-is after safety validation. PNG, JPEG, and WebP images are
normalized and traced into SVG paths with
[`imagetracerjs`](https://github.com/jankovicsandras/imagetracerjs), then saved
locally. Tracing is an approximate vector conversion, not a pixel-perfect copy.

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
3. Choose **Preview changes**.
4. Review all six new animations in the grid.
5. Choose **Apply animation**.

The animation is stored locally and works offline. Use **Remove custom
animation** in the same dialog to return to the built-in species animation.

## Reduced motion

When reduced motion is active, the app shows frame 0 and does not advance frames.
You can override the device setting with **Settings → Motion → Always animate**.
