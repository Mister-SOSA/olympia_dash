/**
 * Utility function to play a notification sound
 * @param soundFile - Path to the sound file (relative to public folder)
 */
export const playNotificationSound = (soundFile: string = '/notification.ogg'): void => {
  try {
    const audio = new Audio(soundFile);
    audio.volume = 0.5; // Set volume to 50%
    audio.play().catch((error) => {
      console.warn('Failed to play notification sound:', error);
    });
  } catch (error) {
    console.warn('Error creating audio element:', error);
  }
};
