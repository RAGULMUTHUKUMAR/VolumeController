import Slider from '@react-native-community/slider';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { VolumeManager } from 'react-native-volume-manager';

const VOLUME_STEP = 0.05;

function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" />
      <VolumeControl />
    </SafeAreaProvider>
  );
}

function VolumeControl() {
  const insets = useSafeAreaInsets();
  const [volume, setVolume] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const volumeRef = useRef(0);
  const isSliding = useRef(false);
  const isMounted = useRef(false);

  const updateVolume = useCallback((value: number) => {
    const nextVolume = Math.max(0, Math.min(1, value));
    volumeRef.current = nextVolume;
    setVolume(nextVolume);
    return nextVolume;
  }, []);

  const applyVolume = useCallback(
    async (value: number) => {
      const nextVolume = updateVolume(value);
      setError(null);

      try {
        await VolumeManager.setVolume(nextVolume, {
          type: 'music',
          showUI: false,
        });
      } catch {
        if (isMounted.current) {
          setError('Could not change media volume. Please try again.');
        }
      }
    },
    [updateVolume],
  );

  useEffect(() => {
    isMounted.current = true;
    let volumeChanged = false;
    const subscription = VolumeManager.addVolumeListener(result => {
      if (result.type && result.type !== 'music') {
        return;
      }

      volumeChanged = true;
      if (!isSliding.current) {
        updateVolume(result.volume);
        setError(null);
      }
    });

    VolumeManager.getVolume()
      .then(result => {
        if (isMounted.current && !volumeChanged) {
          updateVolume(result.volume);
          setError(null);
        }
      })
      .catch(() => {
        if (isMounted.current) {
          setError('Could not read media volume from this device.');
        }
      });

    return () => {
      isMounted.current = false;
      subscription.remove();
    };
  }, [updateVolume]);

  const adjustVolume = (amount: number) => {
    applyVolume(volumeRef.current + amount);
  };

  const handleSlidingComplete = (value: number) => {
    isSliding.current = false;
    applyVolume(value);
  };

  const volumePercent = volume === null ? '--' : `${Math.round(volume * 100)}%`;

  return (
    <View
      style={[
        styles.screen,
        {
          paddingTop: Math.max(insets.top, 24),
          paddingBottom: Math.max(insets.bottom, 24),
        },
      ]}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>DEVICE CONTROL</Text>
        <Text style={styles.title}>Media volume</Text>
        <Text style={styles.subtitle}>
          Adjust your playback level without the side buttons.
        </Text>
      </View>

      <View style={styles.volumeCard}>
        <View style={styles.volumeReadout}>
          <Text style={styles.volumePercent}>{volumePercent}</Text>
          <Text style={styles.volumeCaption}>CURRENT LEVEL</Text>
        </View>

        <View style={styles.sliderRow}>
          <Text style={styles.sliderIcon} accessibilityLabel="Volume muted">
            −
          </Text>
          <Slider
            accessibilityLabel="Media volume"
            accessibilityValue={{
              min: 0,
              max: 100,
              now: volume === null ? 0 : Math.round(volume * 100),
            }}
            disabled={volume === null}
            maximumTrackTintColor="#343B49"
            maximumValue={1}
            minimumTrackTintColor="#8B9CFF"
            minimumValue={0}
            onSlidingStart={() => {
              isSliding.current = true;
            }}
            onValueChange={value => {
              applyVolume(value);
            }}
            onSlidingComplete={handleSlidingComplete}
            style={styles.slider}
            thumbTintColor="#FFFFFF"
            value={volume ?? 0}
          />
          <Text style={styles.sliderIcon} accessibilityLabel="Volume high">
            +
          </Text>
        </View>

        <View style={styles.buttonRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Decrease media volume"
            disabled={volume === null}
            onPress={() => adjustVolume(-VOLUME_STEP)}
            style={({ pressed }) => [
              styles.volumeButton,
              styles.secondaryButton,
              pressed && styles.buttonPressed,
              volume === null && styles.buttonDisabled,
            ]}>
            <Text style={styles.secondaryButtonSymbol}>−</Text>
            <Text style={styles.secondaryButtonLabel}>Volume -</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Increase media volume"
            disabled={volume === null}
            onPress={() => adjustVolume(VOLUME_STEP)}
            style={({ pressed }) => [
              styles.volumeButton,
              styles.primaryButton,
              pressed && styles.buttonPressed,
              volume === null && styles.buttonDisabled,
            ]}>
            <Text style={styles.primaryButtonSymbol}>+</Text>
            <Text style={styles.primaryButtonLabel}>Volume +</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.statusDot} />
        <Text style={styles.footerText}>Synced with system media volume</Text>
      </View>
      {error !== null && (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#10131A',
  },
  header: {
    marginBottom: 36,
  },
  eyebrow: {
    marginBottom: 10,
    color: '#A8B3FF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.8,
  },
  title: {
    color: '#F5F6FA',
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  subtitle: {
    marginTop: 10,
    color: '#A0A8B8',
    fontSize: 15,
    lineHeight: 22,
  },
  volumeCard: {
    padding: 22,
    borderWidth: 1,
    borderColor: '#272D39',
    borderRadius: 24,
    backgroundColor: '#191E28',
  },
  volumeReadout: {
    alignItems: 'center',
    marginBottom: 14,
  },
  volumePercent: {
    color: '#F5F6FA',
    fontSize: 56,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  volumeCaption: {
    marginTop: 2,
    color: '#9099AA',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  sliderIcon: {
    width: 20,
    color: '#B3BBC9',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  slider: {
    flex: 1,
    height: 44,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  volumeButton: {
    flex: 1,
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 16,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#3A4251',
    backgroundColor: '#222834',
  },
  primaryButton: {
    backgroundColor: '#7587F7',
  },
  secondaryButtonSymbol: {
    color: '#EEF0F6',
    fontSize: 24,
    fontWeight: '500',
  },
  secondaryButtonLabel: {
    color: '#EEF0F6',
    fontSize: 14,
    fontWeight: '600',
  },
  primaryButtonSymbol: {
    color: '#10131A',
    fontSize: 24,
    fontWeight: '500',
  },
  primaryButtonLabel: {
    color: '#10131A',
    fontSize: 14,
    fontWeight: '700',
  },
  buttonPressed: {
    opacity: 0.75,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#76D6A0',
  },
  footerText: {
    color: '#9099AA',
    fontSize: 12,
  },
  error: {
    marginTop: 12,
    color: '#FF9A9A',
    fontSize: 13,
    textAlign: 'center',
  },
});

export default App;
