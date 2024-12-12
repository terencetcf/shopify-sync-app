// Use a local audio file from the public directory
export const notificationInfo = new Audio('/sounds/notification-info.wav');

// Set volume
notificationInfo.volume = 0.5;

// Preload the audio
notificationInfo.load();
