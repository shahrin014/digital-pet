import type { AnimationState } from '../animation/types';
import type { Activity, Mood, NeedKey, Species } from '../game/types';
import type { MessageKey } from './messages';

export const SPECIES_KEYS: Record<Species, MessageKey> = {
  fox: 'species.fox',
  cat: 'species.cat',
  bunny: 'species.bunny',
};

export const NEED_KEYS: Record<NeedKey, MessageKey> = {
  fullness: 'need.fullness',
  energy: 'need.energy',
  happiness: 'need.happiness',
};

export const MOOD_KEYS: Record<Mood, MessageKey> = {
  happy: 'mood.happy',
  content: 'mood.content',
  needy: 'mood.needy',
  critical: 'mood.critical',
};

export const ACTIVITY_KEYS: Record<Activity, MessageKey> = {
  awake: 'activity.awake',
  sleeping: 'activity.sleeping',
  walking: 'activity.walking',
};

export const ANIMATION_STATE_KEYS: Record<AnimationState, MessageKey> = {
  idle: 'animation.state.idle',
  feed: 'animation.state.feed',
  play: 'animation.state.play',
  sleep: 'animation.state.sleep',
  wake: 'animation.state.wake',
  walk: 'animation.state.walk',
};

export const SPECIES_BLURB_KEYS: Record<Species, MessageKey> = {
  fox: 'adoption.blurb.fox',
  cat: 'adoption.blurb.cat',
  bunny: 'adoption.blurb.bunny',
};
