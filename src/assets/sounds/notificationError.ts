// Use a local audio file from the public directory
export const notificationError = new Audio('/sounds/notification-error.wav');

// Set volume
notificationError.volume = 0.5;

// Preload the audio
notificationError.load();
