import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { BuildableType } from '../island/objectCatalog';
import {
  formatSpriteCalibration,
  getDefaultSpriteCalibration,
  type SpriteCalibration,
} from './spriteCatalog';

const ANCHOR_STEP = 0.01;
const SCALE_STEP = 1.03;

function Stepper({ label, value, onMinus, onPlus }: {
  label: string;
  value: string;
  onMinus: () => void;
  onPlus: () => void;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={`${label} moins`} onPress={onMinus} style={({ pressed }) => [styles.stepButton, pressed && styles.pressed]}>
        <Text style={styles.stepText}>−</Text>
      </Pressable>
      <Text style={styles.value}>{value}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={`${label} plus`} onPress={onPlus} style={({ pressed }) => [styles.stepButton, pressed && styles.pressed]}>
        <Text style={styles.stepText}>+</Text>
      </Pressable>
    </View>
  );
}

export function DevSpriteCalibrationPanel({ type, calibration, onChange, onReset }: {
  type: BuildableType;
  calibration: SpriteCalibration;
  onChange: (next: SpriteCalibration) => void;
  onReset: () => void;
}) {
  // Defense in depth: even an accidental production render call shows nothing.
  if (!__DEV__) return null;
  const baseWidth = getDefaultSpriteCalibration(type).renderWidth;
  const snippet = formatSpriteCalibration(type, calibration);
  const adjustWidth = (direction: -1 | 1) => onChange({
    ...calibration,
    renderWidth: Number(Math.max(baseWidth * 0.4, Math.min(baseWidth * 2,
      calibration.renderWidth * (direction > 0 ? SCALE_STEP : 1 / SCALE_STEP),
    )).toFixed(1)),
  });
  const adjustAnchor = (key: 'groundAnchorX' | 'groundAnchorY', direction: -1 | 1) => onChange({
    ...calibration,
    [key]: Number(Math.max(0, Math.min(1, calibration[key] + direction * ANCHOR_STEP)).toFixed(2)),
  });

  return (
    <View style={styles.panel}>
      <Text style={styles.title}>DEV · {type}</Text>
      <Stepper label="Largeur" value={`${calibration.renderWidth.toFixed(1)} · ${Math.round(calibration.renderWidth / baseWidth * 100)}%`} onMinus={() => adjustWidth(-1)} onPlus={() => adjustWidth(1)} />
      <Stepper label="Ancre X" value={calibration.groundAnchorX.toFixed(2)} onMinus={() => adjustAnchor('groundAnchorX', -1)} onPlus={() => adjustAnchor('groundAnchorX', 1)} />
      <Stepper label="Ancre Y" value={calibration.groundAnchorY.toFixed(2)} onMinus={() => adjustAnchor('groundAnchorY', -1)} onPlus={() => adjustAnchor('groundAnchorY', 1)} />
      <View style={styles.footer}>
        <Pressable accessibilityRole="button" accessibilityLabel="Réinitialiser le sprite" onPress={onReset} style={({ pressed }) => [styles.footerButton, pressed && styles.pressed]}><Text style={styles.footerText}>Reset</Text></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Afficher les valeurs du sprite dans les logs" onPress={() => console.info(`[sprite calibration] ${type}: { ${snippet} }`)} style={({ pressed }) => [styles.footerButton, pressed && styles.pressed]}><Text style={styles.footerText}>Log values</Text></Pressable>
      </View>
      <Text selectable style={styles.snippet}>{snippet}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { position: 'absolute', top: 83, right: 12, width: 210, padding: 8, borderRadius: 12, borderWidth: 1, borderColor: '#73C6E2', backgroundColor: 'rgba(15, 35, 50, 0.94)', zIndex: 5, elevation: 8 },
  title: { color: '#9DE3F4', fontSize: 10, fontWeight: '900', marginBottom: 5 },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 32, gap: 3 },
  label: { width: 46, color: '#E9F4FA', fontSize: 9, fontWeight: '800' },
  stepButton: { width: 30, height: 29, alignItems: 'center', justifyContent: 'center', borderRadius: 7, backgroundColor: '#315972', borderWidth: 1, borderColor: '#79A8C0' },
  stepText: { color: '#FFFFFF', fontSize: 18, lineHeight: 22, fontWeight: '800' },
  value: { flex: 1, color: '#FFFFFF', textAlign: 'center', fontSize: 9, fontWeight: '900' },
  footer: { flexDirection: 'row', gap: 5, marginTop: 6 },
  footerButton: { flex: 1, paddingVertical: 6, alignItems: 'center', borderRadius: 7, backgroundColor: '#386B89' },
  footerText: { color: '#FFFFFF', fontSize: 9, fontWeight: '800' },
  snippet: { color: '#BDD3DF', fontSize: 8, lineHeight: 11, marginTop: 6 },
  pressed: { opacity: 0.7 },
});
