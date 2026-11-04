import { useEffect, useState } from 'react';
import {
  deriveMood,
  formatWalkRemaining,
  remainingWalkMs,
  walkProgress,
} from '../game/engine';
import type { ActionType, Activity, Mood, NeedKey, Pet } from '../game/types';
import {
  ANIMATION_LABELS,
  type AnimationState,
  type RenderedAnimationPack,
} from '../animation/types';
import { ActionBar } from './ActionBar';
import { CustomPetRenderer } from './CustomPetRenderer';
import { NeedMeter } from './NeedMeter';
import { PetArt } from './PetArt';

const MOOD_LABELS: Record<Mood, string> = {
  happy: 'Happy',
  content: 'Content',
  needy: 'Needy',
  critical: 'Needs care',
};

const ACTIVITY_LABELS: Record<Activity, string> = {
  awake: 'Awake',
  sleeping: 'Sleeping',
  walking: 'On a walk',
};

const NEEDS: ReadonlyArray<{ key: NeedKey; label: string }> = [
  { key: 'fullness', label: 'Fullness' },
  { key: 'energy', label: 'Energy' },
  { key: 'happiness', label: 'Happiness' },
];

export interface PetScreenProps {
  pet: Pet;
  animationState: AnimationState;
  renderedAnimationPack: RenderedAnimationPack | null;
  reducedMotion: boolean;
  onAction: (action: ActionType) => void | Promise<void>;
  onOpenSettings: () => void;
  highlightAction?: ActionType | null;
}

export function PetScreen({
  pet,
  animationState,
  renderedAnimationPack,
  reducedMotion,
  onAction,
  onOpenSettings,
  highlightAction = null,
}: PetScreenProps) {
  const [now, setNow] = useState(() => Date.now());
  const mood = deriveMood(pet);
  const walking = pet.activity === 'walking';

  useEffect(() => {
    if (!walking) {
      return;
    }

    setNow(Date.now());
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [walking, pet.walkStartedAt]);

  const remaining = walking ? remainingWalkMs(pet, now) : 0;
  const progress = walking ? walkProgress(pet, now) : 0;
  const progressPercent = Math.round(progress * 100);
  const remainingText = formatWalkRemaining(remaining);

  return (
    <div className="pet-screen">
      <header className="pet-header">
        <div className="pet-header__identity">
          <h1 className="pet-header__name">{pet.name}</h1>
          <p className="pet-header__mood">
            Mood: <strong>{MOOD_LABELS[mood]}</strong>
          </p>
        </div>
        <button
          type="button"
          className="settings-button"
          onClick={onOpenSettings}
        >
          <svg
            className="settings-button__icon"
            viewBox="0 0 24 24"
            aria-hidden="true"
            focusable="false"
          >
            <path
              d="M10.3 3.3h3.4l.5 2.2c.5.2 1 .3 1.4.6l2-1 2.4 2.4-1 2c.2.5.4.9.6 1.4l2.2.5v3.4l-2.2.5c-.2.5-.3 1-.6 1.4l1 2-2.4 2.4-2-1c-.5.2-.9.4-1.4.6l-.5 2.2h-3.4l-.5-2.2c-.5-.2-1-.3-1.4-.6l-2 1-2.4-2.4 1-2c-.2-.5-.4-.9-.6-1.4l-2.2-.5V8.9l2.2-.5c.2-.5.3-1 .6-1.4l-1-2 2.4-2.4 2 1c.5-.2.9-.4 1.4-.6l.5-2.2Z"
              fill="currentColor"
            />
            <circle cx="12" cy="12" r="3.1" fill="var(--cream)" />
          </svg>
          <span>Settings</span>
        </button>
      </header>

      <section className="pet-card" aria-label={`${pet.name}'s status`}>
        <div className="pet-stage">
          {renderedAnimationPack ? (
            <CustomPetRenderer
              frames={renderedAnimationPack.frames[animationState]}
              manifest={renderedAnimationPack.manifest}
              animation={animationState}
              reducedMotion={reducedMotion}
              label={`${pet.name} the ${pet.species}, ${ACTIVITY_LABELS[pet.activity]}, ${ANIMATION_LABELS[animationState]} animation`}
              className="pet-stage__custom"
            />
          ) : (
            <PetArt
              name={pet.name}
              species={pet.species}
              activity={pet.activity}
              animation={animationState}
            />
          )}
        </div>

        <div className="pet-card__status">
          <span className={`activity-badge activity-badge--${pet.activity}`}>
            <span className="activity-badge__dot" aria-hidden="true" />
            {ACTIVITY_LABELS[pet.activity]}
          </span>
          <span className="pet-card__species">
            {pet.species[0]?.toUpperCase()}
            {pet.species.slice(1)}
          </span>
        </div>

        {walking && (
          <div className="walk-progress">
            <div className="walk-progress__header">
              <span>Walk in progress</span>
              <span className="walk-progress__time">
                {remainingText} remaining
              </span>
            </div>
            <div
              className="walk-progress__track"
              role="progressbar"
              aria-label="Walk progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progressPercent}
              aria-valuetext={`${remainingText} remaining`}
            >
              <div
                className="walk-progress__fill"
                style={{ width: `${progressPercent}%` }}
                aria-hidden="true"
              />
            </div>
          </div>
        )}
      </section>

      <section className="needs-panel" aria-labelledby="needs-heading">
        <h2 className="section-heading" id="needs-heading">
          Needs
        </h2>
        <div className="needs-panel__meters">
          {NEEDS.map((need) => (
            <NeedMeter
              key={need.key}
              label={need.label}
              value={pet[need.key]}
            />
          ))}
        </div>
      </section>

      <ActionBar
        pet={pet}
        onAction={onAction}
        highlightAction={highlightAction}
      />
    </div>
  );
}
