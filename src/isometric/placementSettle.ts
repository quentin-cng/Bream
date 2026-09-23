export const PLACEMENT_SETTLE_DURATION_MS = 220;
export const PLACEMENT_SETTLE_START_SCALE = 1.03;

// Visual transform only; the confirmed placement and its canonical sprite
// rectangle remain unchanged throughout the animation.
export function getPlacementSettlePose(progress: number, previewLiftWorldY: number) {
  'worklet';
  const remaining = 1 - Math.max(0, Math.min(1, progress));
  return {
    translateY: remaining === 0 ? 0 : previewLiftWorldY * remaining,
    scale: 1 + (PLACEMENT_SETTLE_START_SCALE - 1) * remaining,
  };
}
