import { Audio } from 'expo-av';
import { Vibration, Platform } from 'react-native';
import type { NotificationPrefs } from '@/lib/notification-prefs';

let soundRef: Audio.Sound | null = null;

export async function playNewOrderRingtone(prefs: NotificationPrefs): Promise<void> {
  if (!prefs.enabled || !prefs.ringtoneEnabled) return;

  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: false,
      playThroughEarpieceAndroid: false,
    });

    if (soundRef) {
      await soundRef.unloadAsync().catch(() => undefined);
      soundRef = null;
    }

    const { sound } = await Audio.Sound.createAsync(
      // Bundled spoken alert: "You have a new order. Please check the order."
      require('../../assets/sounds/new_order.wav'),
      { shouldPlay: true, volume: Math.min(1, Math.max(0, prefs.volume ?? 1)), isLooping: false },
    );
    soundRef = sound;
    sound.setOnPlaybackStatusUpdate((status) => {
      if (!status.isLoaded) return;
      if (status.didJustFinish) {
        void sound.unloadAsync().catch(() => undefined);
        if (soundRef === sound) soundRef = null;
      }
    });
  } catch {
    /* Emulator / missing asset — ignore */
  }

  if (prefs.vibrationEnabled && Platform.OS === 'android') {
    Vibration.vibrate([0, 400, 200, 400, 200, 400]);
  }
}

export async function stopNewOrderRingtone(): Promise<void> {
  if (!soundRef) return;
  try {
    await soundRef.stopAsync();
    await soundRef.unloadAsync();
  } catch {
    /* ignore */
  }
  soundRef = null;
}
