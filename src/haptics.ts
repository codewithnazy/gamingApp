import * as Haptics from 'expo-haptics';

// Haptics can be unavailable (web, some devices, user settings). Never let that break play.
let enabled = true;
export const setHapticsEnabled = (on: boolean) => {
  enabled = on;
};

const safe = (p: () => Promise<void>) => {
  if (!enabled) return;
  try {
    p().catch(() => {});
  } catch {
    // ignore
  }
};

export const tap = () => safe(() => Haptics.selectionAsync());
export const success = () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
export const warning = () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
export const error = () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
