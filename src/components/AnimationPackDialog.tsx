import {
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type MouseEvent,
  type SyntheticEvent,
} from 'react';
import { AnimationPackError } from '../animation/errors';
import { renderAnimationPack } from '../animation/render';
import {
  DEFAULT_FPS,
  parseAnimationSelection,
  sortFrameFiles,
} from '../animation/selection';
import type {
  AnimationState,
  ParsedAnimationPack,
  RenderedAnimationPack,
} from '../animation/types';
import { ANIMATION_STATES } from '../animation/types';
import { CustomPetRenderer } from './CustomPetRenderer';

export interface AnimationPackDialogProps {
  open: boolean;
  customPackName?: string | null;
  customPackError?: boolean;
  reducedMotion: boolean;
  onClose: () => void;
  onApply: (
    pack: ParsedAnimationPack,
    rendered: RenderedAnimationPack,
  ) => Promise<void>;
  onRemove: () => Promise<void>;
}

function emptyFiles(): Record<AnimationState, File[]> {
  return {
    idle: [],
    feed: [],
    play: [],
    sleep: [],
    wake: [],
    walk: [],
  };
}

function defaultFps(): Record<AnimationState, number> {
  return { ...DEFAULT_FPS };
}

const ACCEPT_IMAGES =
  '.svg,.png,.jpg,.jpeg,.webp,image/svg+xml,image/png,image/jpeg,image/webp';

export function AnimationPackDialog({
  open,
  customPackName,
  customPackError = false,
  reducedMotion,
  onClose,
  onApply,
  onRemove,
}: AnimationPackDialogProps) {
  const idPrefix = useId();
  const titleId = `${idPrefix}-title`;
  const descriptionId = `${idPrefix}-description`;
  const dialogRef = useRef<HTMLDialogElement>(null);

  const [name, setName] = useState('Custom animation');
  const [filesByState, setFilesByState] =
    useState<Record<AnimationState, File[]>>(emptyFiles);
  const [fpsByState, setFpsByState] =
    useState<Record<AnimationState, number>>(defaultFps);
  const [parsed, setParsed] = useState<ParsedAnimationPack | null>(null);
  const [rendered, setRendered] = useState<RenderedAnimationPack | null>(null);
  const [issues, setIssues] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    if (open) {
      if (!dialog.open) {
        if (typeof dialog.showModal === 'function') {
          try {
            dialog.showModal();
          } catch {
            dialog.setAttribute('open', '');
          }
        } else {
          dialog.setAttribute('open', '');
        }
      }
    } else if (dialog.open) {
      if (typeof dialog.close === 'function') {
        dialog.close();
      } else {
        dialog.removeAttribute('open');
      }
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    setName('Custom animation');
    setFilesByState(emptyFiles());
    setFpsByState(defaultFps());
    setParsed(null);
    setRendered(null);
    setIssues([]);
    setError(null);
    setBusy(false);
    setConfirmRemove(false);
  }, [open]);

  function invalidatePreview() {
    setParsed(null);
    setRendered(null);
    setIssues([]);
    setError(null);
  }

  function handleBackdropClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === dialogRef.current && !busy) {
      onClose();
    }
  }

  function handleCancel(event: SyntheticEvent<HTMLDialogElement>) {
    event.preventDefault();
    if (!busy) {
      onClose();
    }
  }

  function handleFilesChange(
    state: AnimationState,
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    setFilesByState((current) => ({ ...current, [state]: files }));
    invalidatePreview();
  }

  function handleFpsChange(state: AnimationState, value: string) {
    const next = Number(value);
    setFpsByState((current) => ({ ...current, [state]: next }));
    invalidatePreview();
  }

  async function handlePreview() {
    setBusy(true);
    setIssues([]);
    setError(null);
    setParsed(null);
    setRendered(null);

    try {
      const nextParsed = await parseAnimationSelection({
        name,
        frames: filesByState,
        fps: fpsByState,
      });
      const nextRendered = await renderAnimationPack(nextParsed);
      setParsed(nextParsed);
      setRendered(nextRendered);
    } catch (caught) {
      if (caught instanceof AnimationPackError) {
        setIssues(caught.issues);
      } else {
        setError(
          caught instanceof Error
            ? caught.message
            : 'The animation frames could not be prepared.',
        );
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleApply() {
    if (!parsed || !rendered) {
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await onApply(parsed, rendered);
      onClose();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'The animation could not be saved.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove() {
    setBusy(true);
    setError(null);
    try {
      await onRemove();
      onClose();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'The custom animation could not be removed.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="animation-dialog"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={handleCancel}
      onClick={handleBackdropClick}
    >
      <div className="animation-dialog__panel">
        <header className="animation-dialog__header">
          <div>
            <h2 id={titleId}>Pet animation</h2>
            <p id={descriptionId} className="animation-dialog__lede">
              Select one or more images for each activity. Raster images are
              traced into SVG paths in the browser before they are saved.
            </p>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label="Close animation settings"
            disabled={busy}
          >
            <span aria-hidden="true">✕</span>
          </button>
        </header>

        {customPackName && (
          <section
            className="animation-dialog__section"
            aria-labelledby={`${idPrefix}-current`}
          >
            <h3 id={`${idPrefix}-current`}>Current custom animation</h3>
            <p className="animation-dialog__name">{customPackName}</p>
            {customPackError && (
              <p className="animation-dialog__warning" role="alert">
                This animation could not be loaded. The built-in animation is
                being used.
              </p>
            )}
            {!confirmRemove ? (
              <button
                type="button"
                className="danger-button"
                onClick={() => setConfirmRemove(true)}
                disabled={busy}
              >
                Remove custom animation
              </button>
            ) : (
              <div
                className="danger-confirm"
                role="group"
                aria-label="Confirm removing custom animation"
              >
                <p className="danger-zone__warning">
                  Remove this custom animation and return to the built-in species
                  animation? This cannot be undone.
                </p>
                <div className="danger-zone__actions">
                  <button
                    type="button"
                    className="danger-button"
                    onClick={() => {
                      void handleRemove();
                    }}
                    disabled={busy}
                  >
                    {busy ? 'Removing…' : 'Yes, remove it'}
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setConfirmRemove(false)}
                    disabled={busy}
                  >
                    Keep it
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        <section
          className="animation-dialog__section"
          aria-labelledby={`${idPrefix}-frames`}
        >
          <h3 id={`${idPrefix}-frames`}>Frames</h3>
          <p className="animation-dialog__meta">
            Select 1–24 images per activity. Frames are sorted by filename, so
            name them in playback order. PNG, JPEG, WebP, and SVG are accepted.
          </p>

          <label className="motion-field">
            <span className="motion-field__label">Animation name</span>
            <input
              className="text-input"
              type="text"
              maxLength={32}
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                invalidatePreview();
              }}
              disabled={busy}
            />
          </label>

          <div className="frame-rows">
            {ANIMATION_STATES.map((state) => {
              const files = filesByState[state];
              return (
                <div className="frame-row" key={state}>
                  <div className="frame-row__heading">
                    <span className="frame-row__name">{state}</span>
                    <span className="frame-row__count">
                      {files.length} selected
                    </span>
                  </div>
                  <div className="frame-row__controls">
                    <input
                      type="file"
                      multiple
                      accept={ACCEPT_IMAGES}
                      aria-label={`${state} frames`}
                      onChange={(event) => handleFilesChange(state, event)}
                      disabled={busy}
                    />
                    <label className="frame-row__fps">
                      <span>FPS</span>
                      <input
                        type="number"
                        min={4}
                        max={30}
                        value={fpsByState[state]}
                        aria-label={`${state} FPS`}
                        onChange={(event) =>
                          handleFpsChange(state, event.target.value)
                        }
                        disabled={busy}
                      />
                    </label>
                  </div>
                  {files.length > 0 && (
                    <p className="frame-row__files">
                      {sortFrameFiles(files)
                        .map((file) => file.name)
                        .join(' · ')}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          <div className="animation-dialog__actions">
            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                void handlePreview();
              }}
              disabled={busy}
            >
              {busy ? 'Preparing…' : 'Preview animations'}
            </button>
          </div>

          {busy && (
            <p className="animation-dialog__status" role="status">
              Converting and validating frames…
            </p>
          )}
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          {issues.length > 0 && (
            <div className="animation-dialog__issues" role="alert">
              <p>These frames cannot be used:</p>
              <ul>
                {issues.map((issue, index) => (
                  <li key={`${index}-${issue}`}>{issue}</li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {parsed && rendered && (
          <section
            className="animation-dialog__section"
            aria-labelledby={`${idPrefix}-preview`}
          >
            <h3 id={`${idPrefix}-preview`}>Preview</h3>
            <p className="animation-dialog__name">{parsed.manifest.name}</p>
            <p className="animation-dialog__meta">
              {parsed.manifest.frameWidth} × {parsed.manifest.frameHeight} px
              per converted frame
            </p>
            <div className="animation-preview-grid">
              {ANIMATION_STATES.map((state: AnimationState) => {
                const clip = parsed.manifest.animations[state];
                return (
                  <div className="animation-preview" key={state}>
                    <div className="animation-preview__stage">
                      <CustomPetRenderer
                        frames={rendered.frames[state]}
                        manifest={rendered.manifest}
                        animation={state}
                        reducedMotion={reducedMotion}
                        label={`${state} animation preview`}
                        className="animation-preview__canvas"
                        loopOverride
                      />
                    </div>
                    <p className="animation-preview__label">{state}</p>
                    <p className="animation-preview__meta">
                      {clip.frames} frames · {clip.fps} fps
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <div className="animation-dialog__actions">
          <button
            type="button"
            className="secondary-button"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={() => {
              void handleApply();
            }}
            disabled={busy || !parsed || !rendered}
          >
            {busy ? 'Working…' : 'Apply animation'}
          </button>
        </div>
      </div>
    </dialog>
  );
}
