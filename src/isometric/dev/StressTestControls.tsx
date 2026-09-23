import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { STRESS_TEST_COUNTS, type StressTestCount } from './stressTestPlacements';

function useApproximateFps(enabled: boolean) {
  const [fps, setFps] = useState<number | null>(null);
  useEffect(() => {
    if (!enabled) {
      setFps(null);
      return;
    }
    let frameId = 0;
    let frames = 0;
    let startedAt = performance.now();
    const tick = (now: number) => {
      frames += 1;
      const elapsed = now - startedAt;
      if (elapsed >= 1000) {
        setFps(Math.round(frames * 1000 / elapsed));
        frames = 0;
        startedAt = now;
      }
      frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [enabled]);
  return fps;
}

export function StressTestControls({ target, generatedCount, renderedCount, generationMs, onChange }: {
  target: StressTestCount;
  generatedCount: number;
  renderedCount: number;
  generationMs: number;
  onChange: (count: StressTestCount) => void;
}) {
  const fps = useApproximateFps(target > 0);
  if (!__DEV__) return null;
  return (
    <View pointerEvents="box-none" style={styles.position}>
      <View style={styles.panel} onStartShouldSetResponder={() => true}>
        <Text style={styles.title}>DEV · Stress Skia</Text>
        <View style={styles.buttons}>
          {STRESS_TEST_COUNTS.map((count) => (
            <Pressable
              key={count}
              onPress={() => onChange(count)}
              style={({ pressed }) => [styles.button, target === count && styles.selected, pressed && styles.pressed]}
            >
              <Text style={styles.buttonText}>{count === 0 ? 'Clear' : count}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.metric}>Stress {generatedCount}/{target} · Rendered {renderedCount}</Text>
        <Text style={styles.metric}>JS RAF {fps ?? '—'} fps · Generate {generationMs.toFixed(1)} ms</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  position: { position: 'absolute', top: 210, right: 8 },
  panel: {
    width: 184,
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(126, 211, 255, 0.55)',
    backgroundColor: 'rgba(7, 22, 38, 0.88)',
  },
  title: { color: '#D9F4FF', fontSize: 11, fontWeight: '800', marginBottom: 6 },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  button: {
    minWidth: 31,
    height: 27,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    backgroundColor: '#263E53',
  },
  selected: { backgroundColor: '#238DB5' },
  pressed: { opacity: 0.68 },
  buttonText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
  metric: { color: '#9EB9C9', fontSize: 9, marginTop: 5 },
});
