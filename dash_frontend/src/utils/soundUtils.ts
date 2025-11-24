import { preferencesService } from '@/lib/preferences';
import { NOTIFICATION_SETTINGS } from '@/constants/settings';

/**
 * Utility function to play a notification sound
 * Respects user settings for sound enabled and volume
 * @param soundFile - Path to the sound file (relative to public folder)
 */
export const playNotificationSound = (soundFile: string = '/notification.ogg'): void => {
  try {
    // Check if sound notifications are enabled
    const soundEnabled = preferencesService.get(
      NOTIFICATION_SETTINGS.sound.key,
      NOTIFICATION_SETTINGS.sound.default
    );

    if (!soundEnabled) {
      return; // Sound disabled by user
    }

    // Get volume setting (0-100) and convert to 0-1
    const volumePercent = preferencesService.get(
      NOTIFICATION_SETTINGS.volume.key,
      NOTIFICATION_SETTINGS.volume.default
    ) as number;
    const volume = volumePercent / 100;

    const audio = new Audio(soundFile);
    audio.volume = Math.max(0, Math.min(1, volume)); // Clamp to valid range
    audio.play().catch((error) => {
      console.warn('Failed to play notification sound:', error);
    });
  } catch (error) {
    console.warn('Error creating audio element:', error);
  }
};
