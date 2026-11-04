export const SPECIES = ['fox', 'cat', 'bunny'] as const;
export type Species = (typeof SPECIES)[number];

export const ACTIVITIES = ['awake', 'sleeping', 'walking'] as const;
export type Activity = (typeof ACTIVITIES)[number];

export type Mood = 'happy' | 'content' | 'needy' | 'critical';
export type NeedKey = 'fullness' | 'energy' | 'happiness';
export type ActionType = 'feed' | 'play' | 'sleep' | 'wake' | 'walk' | 'cancelWalk';
export type MessageKind = 'info' | 'success' | 'error';
export type MotionPreference = 'system' | 'full' | 'reduced';

export interface Pet {
  id: string;
  name: string;
  species: Species;
  createdAt: number;
  fullness: number;
  energy: number;
  happiness: number;
  activity: Activity;
  lastUpdatedAt: number;
  walkStartedAt?: number;
  walkDurationMs: number;
}

export interface Preferences {
  browserNotifications: boolean;
  quietHoursEnabled: boolean;
  quietStart: string;
  quietEnd: string;
  motion: MotionPreference;
}

export interface ActionResult {
  pet: Pet;
  changed: boolean;
  message: string;
  kind: MessageKind;
}

export interface Availability {
  available: boolean;
  reason?: string;
}
