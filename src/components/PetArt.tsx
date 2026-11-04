import type { Activity, Species } from '../game/types';
import {
  ANIMATION_LABELS,
  persistentAnimationFor,
  type AnimationState,
} from '../animation/types';

const ACTIVITY_LABELS: Record<Activity, string> = {
  awake: 'awake',
  sleeping: 'sleeping',
  walking: 'walking',
};

export interface PetArtProps {
  name: string;
  species: Species;
  activity: Activity;
  animation?: AnimationState;
  /** Optional accessible description. Defaults to a description of name, species, activity and animation. */
  label?: string;
  className?: string;
}

function Ears({ species }: { species: Species }) {
  if (species === 'bunny') {
    return (
      <g aria-hidden="true">
        <ellipse
          className="pet-art__ear"
          cx="72"
          cy="58"
          rx="16"
          ry="44"
          transform="rotate(-11 72 58)"
        />
        <ellipse
          className="pet-art__ear"
          cx="128"
          cy="58"
          rx="16"
          ry="44"
          transform="rotate(11 128 58)"
        />
        <ellipse
          className="pet-art__inner-ear"
          cx="72"
          cy="58"
          rx="7"
          ry="30"
          transform="rotate(-11 72 58)"
        />
        <ellipse
          className="pet-art__inner-ear"
          cx="128"
          cy="58"
          rx="7"
          ry="30"
          transform="rotate(11 128 58)"
        />
      </g>
    );
  }

  if (species === 'cat') {
    return (
      <g aria-hidden="true">
        <path className="pet-art__ear" d="M60 94 L54 42 L94 76 Z" />
        <path className="pet-art__ear" d="M140 94 L146 42 L106 76 Z" />
        <path className="pet-art__inner-ear" d="M66 84 L62 54 L86 77 Z" />
        <path className="pet-art__inner-ear" d="M134 84 L138 54 L114 77 Z" />
      </g>
    );
  }

  return (
    <g aria-hidden="true">
      <path className="pet-art__ear" d="M58 96 L50 32 L94 72 Z" />
      <path className="pet-art__ear" d="M142 96 L150 32 L106 72 Z" />
      <path className="pet-art__inner-ear" d="M65 84 L60 48 L86 75 Z" />
      <path className="pet-art__inner-ear" d="M135 84 L140 48 L114 75 Z" />
    </g>
  );
}

function SpeciesDetails({ species }: { species: Species }) {
  if (species === 'cat') {
    return (
      <g
        className="pet-art__whiskers"
        aria-hidden="true"
        stroke="var(--pet-accent)"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.7"
      >
        <path d="M78 137 L42 130" />
        <path d="M78 143 L42 143" />
        <path d="M122 137 L158 130" />
        <path d="M122 143 L158 143" />
      </g>
    );
  }

  if (species === 'bunny') {
    return (
      <g className="pet-art__teeth" aria-hidden="true">
        <rect x="93" y="137" width="6" height="9" rx="2" />
        <rect x="101" y="137" width="6" height="9" rx="2" />
      </g>
    );
  }

  return (
    <g className="pet-art__tail" aria-hidden="true">
      <ellipse
        className="pet-art__fur"
        cx="151"
        cy="148"
        rx="33"
        ry="17"
        transform="rotate(-26 151 148)"
      />
      <ellipse
        className="pet-art__cream"
        cx="174"
        cy="133"
        rx="12"
        ry="10"
        transform="rotate(-26 174 133)"
      />
    </g>
  );
}

/**
 * Inline, dependency-free pet art. The SVG is the accessible image container so
 * screen readers announce the pet even when decorative CSS is unavailable.
 */
export function PetArt({
  name,
  species,
  activity,
  animation,
  label,
  className,
}: PetArtProps) {
  const resolvedAnimation = animation ?? persistentAnimationFor(activity);
  const accessibleLabel =
    label ??
    `${name} the ${species}, ${ACTIVITY_LABELS[activity]}, ${ANIMATION_LABELS[resolvedAnimation]} animation`;
  const classes = [
    'pet-art',
    `pet-art--${species}`,
    `pet-art--${activity}`,
    `pet-art--anim-${resolvedAnimation}`,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <svg
      className={classes}
      viewBox="0 0 200 200"
      role="img"
      aria-label={accessibleLabel}
      xmlns="http://www.w3.org/2000/svg"
    >
      <ellipse
        className="pet-art__shadow"
        cx="100"
        cy="177"
        rx="52"
        ry="9"
        aria-hidden="true"
      />

      <g className="pet-art__creature">
        {species === 'fox' && <SpeciesDetails species={species} />}
        <Ears species={species} />

        <ellipse className="pet-art__fur" cx="100" cy="120" rx="56" ry="49" />
        <ellipse
          className="pet-art__belly"
          cx="100"
          cy="148"
          rx="31"
          ry="18"
          aria-hidden="true"
        />

        <ellipse
          className="pet-art__cheek"
          cx="64"
          cy="132"
          rx="10"
          ry="7"
          aria-hidden="true"
        />
        <ellipse
          className="pet-art__cheek"
          cx="136"
          cy="132"
          rx="10"
          ry="7"
          aria-hidden="true"
        />

        {activity === 'sleeping' ? (
          <g
            className="pet-art__eyes pet-art__eyes--closed"
            fill="none"
            stroke="var(--pet-accent)"
            strokeWidth="4"
            strokeLinecap="round"
          >
            <path d="M69 110 q9 9 18 0" />
            <path d="M113 110 q9 9 18 0" />
          </g>
        ) : (
          <g className="pet-art__eyes">
            <circle cx="78" cy="110" r="7" fill="var(--pet-accent)" />
            <circle cx="122" cy="110" r="7" fill="var(--pet-accent)" />
            <circle
              cx="80.5"
              cy="107.5"
              r="2.4"
              fill="var(--pet-cream)"
              aria-hidden="true"
            />
            <circle
              cx="124.5"
              cy="107.5"
              r="2.4"
              fill="var(--pet-cream)"
              aria-hidden="true"
            />
          </g>
        )}

        <ellipse
          className="pet-art__muzzle"
          cx="100"
          cy="137"
          rx="24"
          ry="16"
        />
        <path
          className="pet-art__nose"
          d="M93 131 h14 l-7 7 Z"
          aria-hidden="true"
        />
        <path
          className="pet-art__mouth"
          d="M100 138 q-7 7 -14 2 M100 138 q7 7 14 2"
          fill="none"
          stroke="var(--pet-accent)"
          strokeWidth="2.5"
          strokeLinecap="round"
          aria-hidden="true"
        />

        {species !== 'fox' && <SpeciesDetails species={species} />}

        {activity === 'walking' && (
          <g className="pet-art__walk-lines" aria-hidden="true">
            <path d="M25 123 h15" />
            <path d="M19 133 h17" />
            <path d="M28 143 h13" />
          </g>
        )}

        {activity === 'sleeping' && (
          <text
            className="pet-art__zzz-text"
            x="148"
            y="68"
            textAnchor="middle"
            fill="var(--pet-accent)"
            fontSize="22"
            fontWeight="800"
            aria-hidden="true"
          >
            Zzz
          </text>
        )}
      </g>
    </svg>
  );
}
