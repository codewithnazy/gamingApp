import * as Haptics from 'expo-haptics';

// Haptics can be unavailable (web, some devices, user settings). Never let that break play.
const safe = (p: Promise<void>) => {
  p.catch(() => {});
};

export const tap = () => safe(Haptics.selectionAsync());
export const success = () => safe(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
export const warning = () => safe(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
export const error = () => safe(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
