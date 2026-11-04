import { useEffect, useId, useRef } from 'react';
import { actionAvailability } from '../game/engine';
import type { ActionType, Pet } from '../game/types';

type ControlKey = 'feed' | 'play' | 'sleep' | 'walk';

interface ActionControl {
  key: ControlKey;
  action: ActionType;
  icon: ActionType;
  label: string;
}

export interface ActionBarProps {
  pet: Pet;
  onAction: (action: ActionType) => void | Promise<void>;
  highlightAction?: ActionType | null;
}

function ActionGlyph({ action }: { action: ActionType }) {
  const common = {
    className: 'action-button__icon',
    viewBox: '0 0 24 24',
    'aria-hidden': true,
    focusable: 'false' as const,
  };

  switch (action) {
    case 'feed':
      return (
        <svg {...common}>
          <path
            d="M12 8.6c-2.4-2-6.2-1.1-6.7 2.2-.4 3 1.8 7 4.5 7 1 0 1.5-.5 2.2-.5s1.3.5 2.2.5c2.7 0 4.9-4 4.5-7-.5-3.3-4.3-4.2-6.7-2.2Z"
            fill="currentColor"
          />
          <path
            d="M12 8.6c.1-2.1 1.2-3.6 3.2-4.1.2 2-1 3.4-3.2 4.1Z"
            fill="currentColor"
          />
        </svg>
      );
    case 'play':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="2" />
          <path
            d="M5.4 8.2c2.5 1.3 5.9 1.9 9.3 1.1M6 16.3c2.4-1.6 5.7-2.3 9.1-1.6M9.3 4.3c1.6 2.4 2.3 5.9 1.4 9.2"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
        </svg>
      );
    case 'sleep':
      return (
        <svg {...common}>
          <path
            d="M15.4 4.2A8 8 0 1 0 19.8 14a6.4 6.4 0 0 1-4.4-9.8Z"
            fill="currentColor"
          />
        </svg>
      );
    case 'wake':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="4.2" fill="currentColor" />
          <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M18.7 5.3l-1.4 1.4M6.7 17.3l-1.4 1.4" />
          </g>
        </svg>
      );
    case 'walk':
      return (
        <svg {...common}>
          <ellipse cx="12" cy="15.5" rx="4.2" ry="3.6" fill="currentColor" />
          <circle cx="6.4" cy="9.4" r="2.1" fill="currentColor" />
          <circle cx="10.4" cy="6.7" r="2.1" fill="currentColor" />
          <circle cx="14.5" cy="7.1" r="2.1" fill="currentColor" />
          <circle cx="18" cy="10.4" r="2.1" fill="currentColor" />
        </svg>
      );
    case 'cancelWalk':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="2" />
          <path
            d="m8.8 8.8 6.4 6.4M15.2 8.8l-6.4 6.4"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      );
  }
}

/**
 * The four care controls. Unavailable controls stay focusable and clickable so
 * that activating them can explain why they are unavailable; they use
 * aria-disabled instead of the native disabled attribute.
 */
export function ActionBar({ pet, onAction, highlightAction }: ActionBarProps) {
  const idPrefix = useId();
  const refs = useRef<Partial<Record<ControlKey, HTMLButtonElement | null>>>({});

  const controls: ActionControl[] = [
    { key: 'feed', action: 'feed', icon: 'feed', label: 'Feed' },
    { key: 'play', action: 'play', icon: 'play', label: 'Play' },
    pet.activity === 'sleeping'
      ? { key: 'sleep', action: 'wake', icon: 'wake', label: 'Wake' }
      : { key: 'sleep', action: 'sleep', icon: 'sleep', label: 'Sleep' },
    pet.activity === 'walking'
      ? {
          key: 'walk',
          action: 'cancelWalk',
          icon: 'cancelWalk',
          label: 'Cancel walk',
        }
      : { key: 'walk', action: 'walk', icon: 'walk', label: 'Walk' },
  ];

  const activeKey: ControlKey | null =
    highlightAction === null || highlightAction === undefined
      ? null
      : highlightAction === 'wake' || highlightAction === 'sleep'
        ? 'sleep'
        : highlightAction === 'walk' || highlightAction === 'cancelWalk'
          ? 'walk'
          : highlightAction === 'feed'
            ? 'feed'
            : highlightAction === 'play'
              ? 'play'
              : null;

  useEffect(() => {
    if (activeKey === null) {
      return;
    }
    refs.current[activeKey]?.focus();
  }, [activeKey]);

  return (
    <div className="action-bar" role="group" aria-label="Care actions">
      {controls.map((control) => {
        const availability = actionAvailability(pet, control.action);
        const reasonId = `${idPrefix}-${control.key}-reason`;
        const isHighlighted = activeKey === control.key;
        const classes = [
          'action-button',
          availability.available
            ? 'action-button--available'
            : 'action-button--unavailable',
          isHighlighted ? 'action-button--highlight' : null,
        ]
          .filter(Boolean)
          .join(' ');

        return (
          <button
            key={control.key}
            ref={(node) => {
              refs.current[control.key] = node;
            }}
            type="button"
            className={classes}
            aria-disabled={!availability.available}
            aria-describedby={
              !availability.available && availability.reason
                ? reasonId
                : undefined
            }
            onClick={() => {
              void onAction(control.action);
            }}
            data-action={control.action}
          >
            <ActionGlyph action={control.icon} />
            <span className="action-button__label">{control.label}</span>
            {!availability.available && (
              <span className="action-button__unavailable" aria-hidden="true">
                Unavailable
              </span>
            )}
            {!availability.available && availability.reason && (
              <span id={reasonId} className="visually-hidden">
                {availability.reason}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
