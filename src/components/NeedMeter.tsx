import { needState, type NeedState } from '../game/engine';
import { formatPercent, useTranslation, type MessageKey } from '../i18n';

const STATE_KEYS: Record<NeedState, MessageKey> = {
  empty: 'need.state.empty',
  low: 'need.state.low',
  okay: 'need.state.okay',
  good: 'need.state.good',
  great: 'need.state.great',
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
  const { t } = useTranslation();
  const rounded = Math.min(100, Math.max(0, Math.round(value)));
  const state = needState(rounded);
  const stateLabel = t(STATE_KEYS[state]);

  return (
    <div className={`need-meter need-meter--${state}`}>
      <div className="need-meter__header">
        <span className="need-meter__label">{label}</span>
        <span className="need-meter__value" aria-hidden="true">
          {formatPercent(rounded)}
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
        aria-valuetext={t('need.aria', {
          label,
          value: rounded,
          state: stateLabel,
        })}
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
