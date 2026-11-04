# Proposal: Custom Pets

**Status:** Implemented — archived for history.

## Why

Players want to personalize their pet beyond the built-in species so the pet feels more personally theirs.

## What Changes

- Add a quick one-image upload that fills all six activities.
- Allow per-activity frame overrides through the animation dialog.
- Trace raster images to SVG and store them locally like other animation frames.
- Keep custom pets cosmetic and local-only.

## Current State

The MVP supports one built-in species chosen during adoption. Pet appearance is driven entirely by the species value, and pet data is stored locally on the device.

## Tentative Scope

In scope, if pursued:

- A way to provide a custom pet appearance.
- Saving the custom appearance locally and restoring it on launch.
- Displaying the custom appearance on the main game screen and during care reactions.
- A fallback appearance when a custom image cannot be loaded.

Out of scope until separately proposed:

- Sharing pets with other players.
- A marketplace or monetized cosmetics.
- Cloud storage, accounts, or cross-device sync.
- Rigged or skeletal animation, sharing, and cloud sync.

## Open Questions

| # | Question | Why it matters | Current leaning |
| --- | --- | --- | --- |
| 1 | Upload, builder, or both? | Changes the whole UX and storage model. | Start with a single image upload. |
| 2 | Which formats and limits? | Security, storage quota, and rendering differ for PNG, WebP, and SVG. | PNG and WebP only; reject SVG. |
| 3 | How is the image sized and cropped? | A consistent silhouette is needed for reactions and poses. | Client-side square crop with a preview. |
| 4 | Static image or animation? | Animation raises complexity and file-size limits. | Animation format is specified in the `pet-animation` and `animation-packs` specs. |
| 5 | Are custom pets cosmetic only? | If stats differ, balance and fairness need rules. | Cosmetic only. |
| 6 | Does a custom pet replace the species? | Affects adoption, storage, and fallback behavior. | Keep species as a hidden base; add an optional custom appearance. |
| 7 | Where is the image stored? | IndexedDB quota is limited, especially on iOS. | IndexedDB as a blob, with size limits and downscaling. |
| 8 | What happens if storage is cleared? | Local-only data can be lost. | Show the same warning as the existing reset flow. |
| 9 | Is moderation needed? | Local-only content needs none; sharing or upload would. | No moderation while local-only. |
| 10 | Should multiple pets be supported? | The MVP has one active pet. | Keep one active pet; revisit separately. |
| 11 | What accessibility metadata is required? | Custom images need an alternative description. | Ask for optional alt text, fall back to the pet name. |
| 12 | Is there an export/import path? | Protects custom art from data loss. | Defer; consider alongside save export. |

## Capabilities Affected

- `pet-adoption` — appearance selection during adoption and reset behavior.
- `pet-ui` — rendering custom images, fallbacks, and accessible alternatives.
- `pwa-platform` — storage limits, persistence, and privacy.
- Potentially a new `pet-assets` capability for upload, validation, cropping, and storage.

## Outcome

The custom pet upload was implemented as a quick one-image upload that fills
all six activities, with optional per-activity frame overrides in the animation
dialog. Custom pets are cosmetic, local-only, and use the same image tracing and
IndexedDB storage as other animation frames.

## Implementation

The feature is implemented through the animation dialog and documented in the
`animation-packs` baseline spec. The quick upload uses one image for all six
activities; per-activity frames can override it.

## Related Work

- The `pet-animation` and `animation-packs` baseline specs define the animation
  runtime and image-to-SVG frame conversion. A custom pet appearance can reuse
  that runtime.
