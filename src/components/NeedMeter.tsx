import { needState, type NeedState } from '../game/engine';

const STATE_LABELS: Record<NeedState, string> = {
  empty: 'Empty',
  low: 'Low',
  okay: 'Okay',
  good: 'Good',
  great: 'Great',
};

export interface NeedMeterProps {
  label: string;
  value: number;
}

/**
 * A need meter communicates its value with text, a qualitative state and a
 * bar. The state text keeps the meaning available without colour vision.
 */
export function NeedMeter({ label, value }: NeedMeterProps) {
  const rounded = Math.min(100, Math.max(0, Math.round(value)));
  const state = needState(rounded);
  const stateLabel = STATE_LABELS[state];

  return (
    <div className={`need-meter need-meter--${state}`}>
      <div className="need-meter__header">
        <span className="need-meter__label">{label}</span>
        <span className="need-meter__value" aria-hidden="true">
          {rounded}%
        </span>
        <span className="need-meter__state">{stateLabel}</span>
      </div>
      <div
        className="need-meter__track"
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={rounded}
        aria-valuetext={`${rounded} out of 100, ${stateLabel}`}
      >
        <div
          className="need-meter__fill"
          style={{ width: `${rounded}%` }}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}
