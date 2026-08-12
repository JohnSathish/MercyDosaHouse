import { useEffect, useRef } from 'react';
import { Animated, Image, StyleSheet, Text, View } from 'react-native';
import { useBootstrap } from '@/providers/bootstrap-context';
import { WEBSITE_URL } from '@/lib/constants';
import { resolveAssetUrl } from '@/ui/theme';

/** Remote-config driven splash overlay shown while bootstrap loads. */
export function RemoteSplashOverlay() {
  const { phase, config } = useBootstrap();
  const opacity = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(0.92)).current;

  const branding = config.branding;
  const bg = branding.splashBackgroundColor || '#14532D';
  const logoUri = resolveAssetUrl(
    branding.splashLogoUrl || branding.logoUrl || branding.appIconUrl,
    WEBSITE_URL,
  );
  const bgImage = resolveAssetUrl(branding.splashBackgroundImageUrl, WEBSITE_URL);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(scale, { toValue: 1, duration: 450, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  }, [opacity, scale]);

  useEffect(() => {
    if (phase !== 'ready') return;
    Animated.timing(opacity, { toValue: 0, duration: 280, useNativeDriver: true }).start();
  }, [phase, opacity]);

  if (phase === 'ready') {
    // Keep mounted briefly for fade-out — parent unmounts via conditional
  }

  return (
    <Animated.View
      style={[styles.overlay, { backgroundColor: bg, opacity }]}
      pointerEvents={phase === 'ready' ? 'none' : 'auto'}
    >
      {bgImage ? (
        <Image source={{ uri: bgImage }} style={styles.bgImage} resizeMode="cover" />
      ) : (
        <View style={styles.bgPattern} />
      )}
      <Animated.View style={[styles.content, { transform: [{ scale }] }]}>
        {logoUri ? (
          <Image source={{ uri: logoUri }} style={styles.logo} resizeMode="contain" />
        ) : (
          <View style={styles.logoFallback}>
            <Text style={styles.logoEmoji}>🥘</Text>
          </View>
        )}
        <Text style={styles.appName}>{branding.appName || 'Mercy Dosa House'}</Text>
        <Text style={styles.tagline}>{branding.tagline || 'Crispy Dosas. Happy Hearts.'}</Text>
        <View style={styles.progressTrack}>
          <View style={styles.progressFill} />
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bgImage: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.35,
  },
  bgPattern: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  content: { alignItems: 'center', paddingHorizontal: 32 },
  logo: { width: 112, height: 112, borderRadius: 56 },
  logoFallback: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoEmoji: { fontSize: 48 },
  appName: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '800',
    marginTop: 20,
    textAlign: 'center',
  },
  tagline: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  progressTrack: {
    marginTop: 28,
    width: 120,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
    overflow: 'hidden',
  },
  progressFill: {
    width: '55%',
    height: '100%',
    backgroundColor: '#F59E0B',
    borderRadius: 2,
  },
});
