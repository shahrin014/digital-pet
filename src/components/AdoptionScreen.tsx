import { useId, useRef, useState, type FormEvent } from 'react';
import { NAME_MAX_LENGTH } from '../game/constants';
import { validateName } from '../game/engine';
import { SPECIES, type Species } from '../game/types';
import { useTranslation, type MessageKey } from '../i18n';
import { PetArt } from './PetArt';

const SPECIES_LABEL_KEYS: Record<Species, MessageKey> = {
  fox: 'species.fox',
  cat: 'species.cat',
  bunny: 'species.bunny',
};

const SPECIES_BLURB_KEYS: Record<Species, MessageKey> = {
  fox: 'adoption.blurb.fox',
  cat: 'adoption.blurb.cat',
  bunny: 'adoption.blurb.bunny',
};

export interface AdoptionScreenProps {
  onAdopt: (name: string, species: Species) => Promise<void>;
}

export function AdoptionScreen({ onAdopt }: AdoptionScreenProps) {
  const { t } = useTranslation();
  const idPrefix = useId();
  const nameId = `${idPrefix}-name`;
  const nameHintId = `${idPrefix}-name-hint`;
  const nameErrorId = `${idPrefix}-name-error`;
  const speciesErrorId = `${idPrefix}-species-error`;

  const [name, setName] = useState('');
  const [species, setSpecies] = useState<Species | null>(null);
  const [nameError, setNameError] = useState<MessageKey | null>(null);
  const [speciesError, setSpeciesError] = useState<MessageKey | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const nameInputRef = useRef<HTMLInputElement>(null);
  const speciesFieldsetRef = useRef<HTMLFieldSetElement>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);

    const trimmedName = name.trim();
    const nextNameError = validateName(trimmedName);
    const nextSpeciesError: MessageKey | null =
      species === null ? 'adoption.speciesRequired' : null;

    setNameError(nextNameError);
    setSpeciesError(nextSpeciesError);

    if (nextNameError) {
      nameInputRef.current?.focus();
      return;
    }
    if (nextSpeciesError || species === null) {
      speciesFieldsetRef.current?.focus();
      return;
    }

    setSubmitting(true);
    try {
      await onAdopt(trimmedName, species);
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : t('adoption.error');
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="adoption-screen">
      <header className="adoption-header">
        <p className="eyebrow">{t('adoption.eyebrow')}</p>
        <h1>{t('adoption.title')}</h1>
        <p className="adoption-lede">{t('adoption.lede')}</p>
      </header>

      <form className="adoption-form" onSubmit={handleSubmit} noValidate>
        <div className="form-field">
          <label className="form-label" htmlFor={nameId}>
            {t('adoption.nameLabel')}
          </label>
          <input
            ref={nameInputRef}
            id={nameId}
            className="text-input"
            type="text"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              if (nameError) {
                setNameError(null);
              }
            }}
            placeholder="Mochi"
            autoComplete="off"
            aria-describedby={
              nameError ? `${nameHintId} ${nameErrorId}` : nameHintId
            }
            aria-invalid={nameError ? true : undefined}
          />
          <p className="form-hint" id={nameHintId}>
            {t('adoption.nameHint', { max: NAME_MAX_LENGTH })}
          </p>
          {nameError && (
            <p className="form-error" id={nameErrorId} role="alert">
              {t(nameError, { max: NAME_MAX_LENGTH })}
            </p>
          )}
        </div>

        <fieldset
          ref={speciesFieldsetRef}
          className="species-fieldset"
          tabIndex={-1}
          aria-describedby={speciesError ? speciesErrorId : undefined}
          aria-invalid={speciesError ? true : undefined}
        >
          <legend className="form-label">{t('adoption.speciesLegend')}</legend>
          <div className="species-grid">
            {SPECIES.map((option) => {
              const inputId = `${idPrefix}-species-${option}`;
              const selected = species === option;
              return (
                <label
                  key={option}
                  className={`species-card${
                    selected ? ' species-card--selected' : ''
                  }`}
                  htmlFor={inputId}
                >
                  <input
                    id={inputId}
                    className="species-card__input"
                    type="radio"
                    name={`${idPrefix}-species`}
                    value={option}
                    checked={selected}
                    aria-label={t(SPECIES_LABEL_KEYS[option])}
                    onChange={() => {
                      setSpecies(option);
                      setSpeciesError(null);
                    }}
                  />
                  <span className="species-card__art">
                    <PetArt
                      name={name.trim() || 'Your pet'}
                      species={option}
                      activity="awake"
                      label={t('adoption.speciesIllustration', {
                        species: t(SPECIES_LABEL_KEYS[option]),
                      })}
                    />
                  </span>
                  <span className="species-card__body">
                    <span className="species-card__name">
                      {t(SPECIES_LABEL_KEYS[option])}
                    </span>
                    <span className="species-card__blurb">
                      {t(SPECIES_BLURB_KEYS[option])}
                    </span>
                    <span className="species-card__check" aria-hidden="true">
                      {selected
                        ? t('adoption.selected')
                        : t('adoption.choose')}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
          {speciesError && (
            <p className="form-error" id={speciesErrorId} role="alert">
              {t(speciesError)}
            </p>
          )}
        </fieldset>

        {submitError && (
          <p className="form-error form-error--submit" role="alert">
            {submitError}
          </p>
        )}

        <button
          className="primary-button adoption-submit"
          type="submit"
          aria-busy={submitting}
          disabled={submitting}
        >
          {submitting ? t('adoption.submitting') : t('adoption.submit')}
        </button>
      </form>
    </div>
  );
}
