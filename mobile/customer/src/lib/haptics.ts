import { Platform, Vibration } from 'react-native';

export function hapticTap() {
  try {
    if (Platform.OS === 'android') Vibration.vibrate(14);
    else Vibration.vibrate();
  } catch {
    /* web / simulator */
  }
}

export function hapticSuccess() {
  try {
    Vibration.vibrate(Platform.OS === 'android' ? [0, 12, 40, 18] : 20);
  } catch {
    /* ignore */
  }
}
