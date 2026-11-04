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
import type { Activity, Species } from '../game/types';
import { PetArt } from './PetArt';
import { useTranslation } from '../i18n';
import { ANIMATION_STATE_KEYS } from '../i18n/keys';
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
  petName: string;
  species: Species;
  currentRenderedPack: RenderedAnimationPack | null;
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

function activityForAnimationState(state: AnimationState): Activity {
  if (state === 'sleep') {
    return 'sleeping';
  }
  if (state === 'walk') {
    return 'walking';
  }
  return 'awake';
}

export function AnimationPackDialog({
  open,
  customPackName,
  customPackError = false,
  reducedMotion,
  onClose,
  onApply,
  onRemove,
  petName,
  species,
  currentRenderedPack,
}: AnimationPackDialogProps) {
  const { t } = useTranslation();
  const idPrefix = useId();
  const titleId = `${idPrefix}-title`;
  const descriptionId = `${idPrefix}-description`;
  const dialogRef = useRef<HTMLDialogElement>(null);

  const [name, setName] = useState(() => t('animation.defaultName'));
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
  const [selectedState, setSelectedState] = useState<AnimationState>('idle');

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
    setName(t('animation.defaultName'));
    setFilesByState(emptyFiles());
    setFpsByState(defaultFps());
    setParsed(null);
    setRendered(null);
    setIssues([]);
    setError(null);
    setBusy(false);
    setConfirmRemove(false);
    setSelectedState('idle');
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

  function handleCopyToAll() {
    const selected = filesByState[selectedState];
    if (selected.length === 0) {
      return;
    }
    setFilesByState({
      idle: selected,
      feed: selected,
      play: selected,
      sleep: selected,
      wake: selected,
      walk: selected,
    });
    setName((current) =>
      current === t('animation.defaultName')
        ? t('animation.quick.defaultName')
        : current,
    );
    invalidatePreview();
  }

  function handleShowCurrent() {
    setParsed(null);
    setRendered(null);
    setIssues([]);
    setError(null);
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
            : t('animation.error.generic'),
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
          : t('animation.error.save'),
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
          : t('animation.error.remove'),
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
            <h2 id={titleId}>{t('animation.title')}</h2>
            <p id={descriptionId} className="animation-dialog__lede">
              {t('animation.lede')}
            </p>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label={t('common.close')}
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
            <h3 id={`${idPrefix}-current`}>{t('animation.current')}</h3>
            <p className="animation-dialog__name">{customPackName}</p>
            {customPackError && (
              <p className="animation-dialog__warning" role="alert">
                {t('animation.error')}
              </p>
            )}
            {!confirmRemove ? (
              <button
                type="button"
                className="danger-button"
                onClick={() => setConfirmRemove(true)}
                disabled={busy}
              >
                {t('animation.remove')}
              </button>
            ) : (
              <div
                className="danger-confirm"
                role="group"
                aria-label={t('animation.removeConfirm')}
              >
                <p className="danger-zone__warning">
                  {t('animation.removeConfirm')}
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
                    {busy ? t('animation.working') : t('animation.removeYes')}
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setConfirmRemove(false)}
                    disabled={busy}
                  >
                    {t('animation.removeNo')}
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        <section
          className="animation-dialog__section"
          aria-labelledby={`${idPrefix}-preview`}
        >
          <h3 id={`${idPrefix}-preview`}>
            {parsed && rendered
              ? t('animation.newPreview')
              : t('animation.currentPreview')}
          </h3>
          <div
            className="animation-grid"
            role="group"
            aria-label={t('animation.edit.tabs')}
          >
            {ANIMATION_STATES.map((state) => (
              <button
                key={state}
                type="button"
                aria-pressed={selectedState === state}
                className={`animation-card${
                  selectedState === state ? ' animation-card--active' : ''
                }`}
                onClick={() => setSelectedState(state)}
              >
                <span className="animation-card__stage" aria-hidden="true">
                  {rendered ? (
                    <CustomPetRenderer
                      frames={rendered.frames[state]}
                      manifest={rendered.manifest}
                      animation={state}
                      reducedMotion={reducedMotion}
                      label={t('animation.previewAria', {
                        state: t(ANIMATION_STATE_KEYS[state]),
                      })}
                      className="animation-card__canvas"
                      loopOverride
                    />
                  ) : currentRenderedPack ? (
                    <CustomPetRenderer
                      frames={currentRenderedPack.frames[state]}
                      manifest={currentRenderedPack.manifest}
                      animation={state}
                      reducedMotion={reducedMotion}
                      label={t('animation.previewAria', {
                        state: t(ANIMATION_STATE_KEYS[state]),
                      })}
                      className="animation-card__canvas"
                      loopOverride
                    />
                  ) : (
                    <PetArt
                      name={petName}
                      species={species}
                      activity={activityForAnimationState(state)}
                      animation={state}
                      loop
                    />
                  )}
                </span>
                <span className="animation-card__footer">
                  <span>{t(ANIMATION_STATE_KEYS[state])}</span>
                  {filesByState[state].length > 0 && (
                    <span className="animation-tab__badge">
                      {filesByState[state].length}
                    </span>
                  )}
                </span>
              </button>
            ))}
          </div>
        </section>

        <section
          className="animation-dialog__section"
          aria-labelledby={`${idPrefix}-editor`}
        >
          <h3 id={`${idPrefix}-editor`}>{t('animation.edit.title')}</h3>
          <p className="animation-dialog__meta">{t('animation.edit.hint')}</p>

          <label className="file-field">
            <span className="file-field__label">
              {t('animation.framesAria', {
                state: t(ANIMATION_STATE_KEYS[selectedState]),
              })}
            </span>
            <input
              type="file"
              multiple
              accept={ACCEPT_IMAGES}
              onChange={(event) => handleFilesChange(selectedState, event)}
              disabled={busy}
            />
          </label>

          <label className="motion-field">
            <span className="motion-field__label">{t('animation.name')}</span>
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

          <div className="animation-editor__row">
            <label className="frame-row__fps">
              <span>{t('animation.fps')}</span>
              <input
                type="number"
                min={4}
                max={30}
                value={fpsByState[selectedState]}
                aria-label={t('animation.fpsAria', {
                  state: t(ANIMATION_STATE_KEYS[selectedState]),
                })}
                onChange={(event) =>
                  handleFpsChange(selectedState, event.target.value)
                }
                disabled={busy}
              />
            </label>
            <button
              type="button"
              className="secondary-button"
              onClick={handleCopyToAll}
              disabled={busy || filesByState[selectedState].length === 0}
            >
              {t('animation.copyToAll')}
            </button>
          </div>

          {filesByState[selectedState].length > 0 ? (
            <p className="frame-row__files">
              {sortFrameFiles(filesByState[selectedState])
                .map((file) => file.name)
                .join(' · ')}
            </p>
          ) : (
            <p className="animation-dialog__meta">
              {t('animation.selected', { count: 0 })}
            </p>
          )}

          <div className="animation-dialog__actions">
            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                void handlePreview();
              }}
              disabled={busy}
            >
              {busy ? t('animation.preparing') : t('animation.preview')}
            </button>
            {parsed && rendered && (
              <button
                type="button"
                className="secondary-button"
                onClick={handleShowCurrent}
                disabled={busy}
              >
                {t('animation.showCurrent')}
              </button>
            )}
          </div>

          {busy && (
            <p className="animation-dialog__status" role="status">
              {t('animation.converting')}
            </p>
          )}
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          {issues.length > 0 && (
            <div className="animation-dialog__issues" role="alert">
              <p>{t('animation.issues')}</p>
              <ul>
                {issues.map((issue, index) => (
                  <li key={`${index}-${issue}`}>{issue}</li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <div className="animation-dialog__actions">
          <button
            type="button"
            className="secondary-button"
            onClick={onClose}
            disabled={busy}
          >
            {t('animation.cancel')}
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={() => {
              void handleApply();
            }}
            disabled={busy || !parsed || !rendered}
          >
            {busy ? t('animation.working') : t('animation.apply')}
          </button>
        </div>
      </div>
    </dialog>
  );
}
