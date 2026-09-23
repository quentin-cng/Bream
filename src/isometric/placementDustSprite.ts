import type { Footprint } from '../island/placementGrid';
import type { IsoPoint } from './isometricMath';

const FRAME_WIDTH = 1774 / 4;
const FRAME_HEIGHT = 887 / 2;

// The current sheet is a tightly packed 4 × 2 grid. Fractional source bounds
// preserve the exact 1774 × 887 division rather than dropping edge pixels.
export const PLACEMENT_DUST_SPRITE = {
  source: require('../../assets/animations/building/dust.png') as number,
  sheetWidth: 1774,
  sheetHeight: 887,
  frames: [
    { x: 0, y: FRAME_HEIGHT, width: FRAME_WIDTH, height: FRAME_HEIGHT },
    { x: FRAME_WIDTH, y: FRAME_HEIGHT, width: FRAME_WIDTH, height: FRAME_HEIGHT },
    { x: FRAME_WIDTH * 2, y: FRAME_HEIGHT, width: FRAME_WIDTH, height: FRAME_HEIGHT },
    { x: FRAME_WIDTH * 3, y: FRAME_HEIGHT, width: FRAME_WIDTH, height: FRAME_HEIGHT },
  ],
  frameCount: 4,
  delayMs: 205,
  durationMs: 400,
  // Visual size at 1× world zoom. The effect remains in a screen-space layer,
  // but uses the same zoom ratio as buildings so their relative sizes stay fixed.
  renderSize: { width: 112, height: 112 },
  // The center of the ring/hole is the building's canonical ground contact.
  anchor: { x: 0.5, y: 0.69 },
} as const;

export const PLACEMENT_EFFECT_CLEANUP_MS =
  PLACEMENT_DUST_SPRITE.delayMs + PLACEMENT_DUST_SPRITE.durationMs + 40;

export function getPlacementDustFrameIndex(progress: number): number {
  'worklet';
  return Math.min(PLACEMENT_DUST_SPRITE.frameCount - 1,
    Math.max(0, Math.floor(progress * PLACEMENT_DUST_SPRITE.frameCount)));
}

export function getPlacementDustScale(footprint: Footprint, worldZoom: number): number {
  const footprintFactor = Math.min(1.2, Math.max(1, (footprint.width + footprint.height) / 4));
  const safeZoom = Number.isFinite(worldZoom) && worldZoom > 0 ? worldZoom : 1;
  return PLACEMENT_DUST_SPRITE.renderSize.width / FRAME_WIDTH * footprintFactor * safeZoom;
}

// Atlas uses a source rectangle plus a transform. Center each differently sized
// phase on the same canonical ground anchor; keep the painted baseline on it.
export function getPlacementDustFramePose(
  frameIndex: number,
  screenGround: IsoPoint,
  footprint: Footprint,
  worldZoom: number,
) {
  const frame = PLACEMENT_DUST_SPRITE.frames[frameIndex];
  const scale = getPlacementDustScale(footprint, worldZoom);
  return {
    source: frame,
    scale,
    x: screenGround.x - frame.width * PLACEMENT_DUST_SPRITE.anchor.x * scale,
    y: screenGround.y - frame.height * PLACEMENT_DUST_SPRITE.anchor.y * scale,
  };
}

// Keep the screen-space overlay around the lower building base, never the roof.
export function getPlacementDustFrontBand(screenGround: IsoPoint, footprint: Footprint, worldZoom: number) {
  const scale = getPlacementDustScale(footprint, worldZoom);
  const renderedWidth = FRAME_WIDTH * scale;
  const renderedHeight = FRAME_HEIGHT * scale;
  return {
    x: screenGround.x - renderedWidth * 0.55,
    y: screenGround.y - renderedHeight * 0.14,
    width: renderedWidth * 1.1,
    height: renderedHeight * 0.28,
  };
}
