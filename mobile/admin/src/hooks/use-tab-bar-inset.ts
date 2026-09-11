import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Typical Android 3-button navigation bar height in dp. */
const ANDROID_THREE_BUTTON_NAV = 48;

function isHyperOsFamily() {
  if (Platform.OS !== 'android') return false;
  const constants = Platform.constants as {
    Brand?: string;
    Manufacturer?: string;
    Model?: string;
  };
  const blob =
    `${constants.Brand ?? ''} ${constants.Manufacturer ?? ''} ${constants.Model ?? ''}`.toLowerCase();
  return ['xiaomi', 'redmi', 'poco', 'blackshark'].some((token) => blob.includes(token));
}

/**
 * Bottom padding for the admin tab bar.
 * Redmi/Xiaomi HyperOS often draws 3-button nav over the app while reporting inset 0.
 */
export function useTabBarBottomInset() {
  const insets = useSafeAreaInsets();
  if (insets.bottom > 12) return insets.bottom;
  if (isHyperOsFamily()) return ANDROID_THREE_BUTTON_NAV;
  return Math.max(insets.bottom, 8);
}
