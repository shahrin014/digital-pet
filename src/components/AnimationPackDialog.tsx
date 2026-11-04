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
  const [quickFileName, setQuickFileName] = useState<string | null>(null);
  const [previewState, setPreviewState] = useState<AnimationState>('idle');
  const [replayKey, setReplayKey] = useState(0);

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
    setQuickFileName(null);
    setPreviewState('idle');
    setReplayKey(0);
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

  function handleQuickUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }

    setQuickFileName(file.name);
    setFilesByState({
      idle: [file],
      feed: [file],
      play: [file],
      sleep: [file],
      wake: [file],
      walk: [file],
    });
    setName((current) =>
      current === t('animation.defaultName')
        ? t('animation.quick.defaultName')
        : current,
    );
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
          aria-labelledby={`${idPrefix}-current-preview`}
        >
          <h3 id={`${idPrefix}-current-preview`}>
            {t('animation.currentPreview')}
          </h3>
          <div className="current-preview">
            <div className="current-preview__stage">
              {currentRenderedPack ? (
                <CustomPetRenderer
                  key={`${previewState}-${replayKey}`}
                  frames={currentRenderedPack.frames[previewState]}
                  manifest={currentRenderedPack.manifest}
                  animation={previewState}
                  reducedMotion={reducedMotion}
                  label={t('animation.previewAria', {
                    state: t(ANIMATION_STATE_KEYS[previewState]),
                  })}
                  className="current-preview__canvas"
                  loopOverride
                />
              ) : (
                <PetArt
                  key={`${previewState}-${replayKey}`}
                  name={petName}
                  species={species}
                  activity={activityForAnimationState(previewState)}
                  animation={previewState}
                  loop
                />
              )}
            </div>
            <div
              className="current-preview__states"
              role="group"
              aria-label={t('animation.choosePreview')}
            >
              {ANIMATION_STATES.map((state) => (
                <button
                  key={state}
                  type="button"
                  className={`current-preview__state${
                    previewState === state
                      ? ' current-preview__state--active'
                      : ''
                  }`}
                  aria-pressed={previewState === state}
                  onClick={() => {
                    setPreviewState(state);
                    setReplayKey((key) => key + 1);
                  }}
                >
                  {t(ANIMATION_STATE_KEYS[state])}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="secondary-button"
              onClick={() => setReplayKey((key) => key + 1)}
            >
              {t('animation.replay')}
            </button>
          </div>
        </section>

        <section
          className="animation-dialog__section"
          aria-labelledby={`${idPrefix}-quick`}
        >
          <h3 id={`${idPrefix}-quick`}>{t('animation.quick.title')}</h3>
          <p className="animation-dialog__meta">{t('animation.quick.hint')}</p>
          <label className="file-field">
            <span className="file-field__label">
              {t('animation.quick.label')}
            </span>
            <input
              type="file"
              accept={ACCEPT_IMAGES}
              onChange={handleQuickUpload}
              disabled={busy}
            />
          </label>
          {quickFileName && (
            <p className="animation-dialog__filename">{quickFileName}</p>
          )}
        </section>

        <section
          className="animation-dialog__section"
          aria-labelledby={`${idPrefix}-frames`}
        >
          <h3 id={`${idPrefix}-frames`}>{t('animation.frames')}</h3>
          <p className="animation-dialog__meta">
            {t('animation.framesHint')}
          </p>

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

          <div className="frame-rows">
            {ANIMATION_STATES.map((state) => {
              const files = filesByState[state];
              return (
                <div className="frame-row" key={state}>
                  <div className="frame-row__heading">
                    <span className="frame-row__name">{t(ANIMATION_STATE_KEYS[state])}</span>
                    <span className="frame-row__count">
                      {t('animation.selected', { count: files.length })}
                    </span>
                  </div>
                  <div className="frame-row__controls">
                    <input
                      type="file"
                      multiple
                      accept={ACCEPT_IMAGES}
                      aria-label={t('animation.framesAria', { state: t(ANIMATION_STATE_KEYS[state]) })}
                      onChange={(event) => handleFilesChange(state, event)}
                      disabled={busy}
                    />
                    <label className="frame-row__fps">
                      <span>{t('animation.fps')}</span>
                      <input
                        type="number"
                        min={4}
                        max={30}
                        value={fpsByState[state]}
                        aria-label={t('animation.fpsAria', { state: t(ANIMATION_STATE_KEYS[state]) })}
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
              {busy ? t('animation.preparing') : t('animation.preview')}
            </button>
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

        {parsed && rendered && (
          <section
            className="animation-dialog__section"
            aria-labelledby={`${idPrefix}-preview`}
          >
            <h3 id={`${idPrefix}-preview`}>{t('animation.previewTitle')}</h3>
            <p className="animation-dialog__name">{parsed.manifest.name}</p>
            <p className="animation-dialog__meta">
              {t('animation.frameSize', {
                width: parsed.manifest.frameWidth,
                height: parsed.manifest.frameHeight,
              })}
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
                        label={t('animation.previewAria', { state: t(ANIMATION_STATE_KEYS[state]) })}
                        className="animation-preview__canvas"
                        loopOverride
                      />
                    </div>
                    <p className="animation-preview__label">{t(ANIMATION_STATE_KEYS[state])}</p>
                    <p className="animation-preview__meta">
                      {t('animation.frameMeta', {
                        frames: t(
                          clip.frames === 1
                            ? 'animation.frameCount.one'
                            : 'animation.frameCount.other',
                          { count: clip.frames },
                        ),
                        fps: clip.fps,
                      })}
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
