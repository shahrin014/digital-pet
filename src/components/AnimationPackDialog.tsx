import {
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type MouseEvent,
  type SyntheticEvent,
} from 'react';
import {
  AnimationPackError,
  parsePetPackFile,
} from '../animation/pack';
import { renderAnimationPack } from '../animation/render';
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

  const [parsed, setParsed] = useState<ParsedAnimationPack | null>(null);
  const [rendered, setRendered] = useState<RenderedAnimationPack | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
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
    setParsed(null);
    setRendered(null);
    setFileName(null);
    setIssues([]);
    setError(null);
    setBusy(false);
    setConfirmRemove(false);
  }, [open]);

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

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }

    setBusy(true);
    setIssues([]);
    setError(null);
    setParsed(null);
    setRendered(null);
    setFileName(file.name);

    try {
      const nextParsed = await parsePetPackFile(file);
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
            : 'The animation pack could not be loaded.',
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
          : 'The animation pack could not be saved.',
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
              Load a <code>.petpack</code> with one SVG per frame, preview all
              six activities, then apply it to your pet.
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
                This pack could not be loaded. The built-in animation is being
                used.
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
          aria-labelledby={`${idPrefix}-upload`}
        >
          <h3 id={`${idPrefix}-upload`}>Upload a pack</h3>
          <label className="file-field">
            <span className="file-field__label">Choose a .petpack file</span>
            <input
              type="file"
              accept=".petpack,application/zip"
              onChange={(event) => {
                void handleFileChange(event);
              }}
              disabled={busy}
            />
          </label>
          {fileName && (
            <p className="animation-dialog__filename" aria-live="polite">
              {fileName}
            </p>
          )}
          <p className="animation-dialog__sample">
            New to packs?{' '}
            <a href="samples/example.petpack" download>
              Download a sample .petpack
            </a>
            .
          </p>
          {busy && (
            <p className="animation-dialog__status" role="status">
              Reading and validating the pack…
            </p>
          )}
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          {issues.length > 0 && (
            <div className="animation-dialog__issues" role="alert">
              <p>This pack cannot be used:</p>
              <ul>
                {issues.map((issue) => (
                  <li key={issue}>{issue}</li>
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
              per frame
            </p>
            {parsed.manifest.description && (
              <p className="animation-dialog__description">
                {parsed.manifest.description}
              </p>
            )}
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
            {busy ? 'Working…' : 'Apply animation pack'}
          </button>
        </div>
      </div>
    </dialog>
  );
}
