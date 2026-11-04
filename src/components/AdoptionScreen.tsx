import { useId, useRef, useState, type FormEvent } from 'react';
import { NAME_MAX_LENGTH } from '../game/constants';
import { validateName } from '../game/engine';
import { SPECIES, type Species } from '../game/types';
import { PetArt } from './PetArt';

const SPECIES_LABELS: Record<Species, string> = {
  fox: 'Fox',
  cat: 'Cat',
  bunny: 'Bunny',
};

const SPECIES_BLURBS: Record<Species, string> = {
  fox: 'Curious and a little mischievous.',
  cat: 'Calm, cozy and fond of naps.',
  bunny: 'Gentle and always up for a hop.',
};

export interface AdoptionScreenProps {
  onAdopt: (name: string, species: Species) => Promise<void>;
}

export function AdoptionScreen({ onAdopt }: AdoptionScreenProps) {
  const idPrefix = useId();
  const nameId = `${idPrefix}-name`;
  const nameHintId = `${idPrefix}-name-hint`;
  const nameErrorId = `${idPrefix}-name-error`;
  const speciesErrorId = `${idPrefix}-species-error`;

  const [name, setName] = useState('');
  const [species, setSpecies] = useState<Species | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [speciesError, setSpeciesError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const nameInputRef = useRef<HTMLInputElement>(null);
  const speciesFieldsetRef = useRef<HTMLFieldSetElement>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);

    const trimmedName = name.trim();
    const nextNameError = validateName(trimmedName);
    const nextSpeciesError = species === null ? 'Please choose a species.' : null;

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
          : 'Your pet could not be adopted. Please try again.';
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="adoption-screen">
      <header className="adoption-header">
        <p className="eyebrow">A cozy friend awaits</p>
        <h1>Adopt a pet</h1>
        <p className="adoption-lede">
          Choose a name and a companion. Your pet lives only on this device, so
          no account or sign-in is needed.
        </p>
      </header>

      <form className="adoption-form" onSubmit={handleSubmit} noValidate>
        <div className="form-field">
          <label className="form-label" htmlFor={nameId}>
            Pet name
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
            {NAME_MAX_LENGTH} characters or fewer, after trimming spaces.
          </p>
          {nameError && (
            <p className="form-error" id={nameErrorId} role="alert">
              {nameError}
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
          <legend className="form-label">Choose a species</legend>
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
                    aria-label={SPECIES_LABELS[option]}
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
                      label={`${SPECIES_LABELS[option]} illustration`}
                    />
                  </span>
                  <span className="species-card__body">
                    <span className="species-card__name">
                      {SPECIES_LABELS[option]}
                    </span>
                    <span className="species-card__blurb">
                      {SPECIES_BLURBS[option]}
                    </span>
                    <span className="species-card__check" aria-hidden="true">
                      {selected ? 'Selected' : 'Choose'}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
          {speciesError && (
            <p className="form-error" id={speciesErrorId} role="alert">
              {speciesError}
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
          {submitting ? 'Adopting…' : 'Adopt your pet'}
        </button>
      </form>
    </div>
  );
}
