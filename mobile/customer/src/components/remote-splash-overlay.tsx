import { useEffect, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet, View } from 'react-native';
import { useBootstrap } from '@/providers/bootstrap-context';

/** Full branded launch art — matches the Mercy Dosa House splash mockup. */
const SPLASH_ART = require('@/assets/splash-screen.png');

/**
 * Native-feeling branded splash shown while bootstrap loads.
 * Uses the designed full-bleed splash art (logo, hero dosa, features, welcome).
 */
export function RemoteSplashOverlay() {
  const { phase } = useBootstrap();
  const opacity = useRef(new Animated.Value(1)).current;
  const progress = useRef(new Animated.Value(0.2)).current;
  const scale = useRef(new Animated.Value(1.02)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(scale, {
        toValue: 1,
        duration: 900,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(progress, {
            toValue: 0.78,
            duration: 1500,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: false,
          }),
          Animated.timing(progress, {
            toValue: 0.32,
            duration: 1000,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: false,
          }),
        ]),
      ),
    ]).start();
  }, [progress, scale]);

  useEffect(() => {
    if (phase !== 'ready') return;
    Animated.timing(opacity, {
      toValue: 0,
      duration: 380,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [phase, opacity]);

  const progressWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <Animated.View
      style={[styles.overlay, { opacity }]}
      pointerEvents={phase === 'ready' ? 'none' : 'auto'}
    >
      <Animated.View style={[styles.artWrap, { transform: [{ scale }] }]}>
        <Image source={SPLASH_ART} style={styles.art} resizeMode="cover" />
      </Animated.View>

      {/* Live progress bar aligned to the mockup’s loader position */}
      <View style={styles.progressSlot} pointerEvents="none">
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    elevation: 9999,
    backgroundColor: '#123D28',
  },
  artWrap: {
    ...StyleSheet.absoluteFillObject,
  },
  art: {
    width: '100%',
    height: '100%',
  },
  progressSlot: {
    position: 'absolute',
    left: 48,
    right: 48,
    bottom: '14%',
    zIndex: 2,
    elevation: 2,
  },
  progressTrack: {
    height: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.22)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#F0A12A',
  },
});
