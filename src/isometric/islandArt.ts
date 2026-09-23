import type { IsoGridMetrics } from './isometricMath';

// Pixel coordinates in the transparent PNG. The art's grassy center is the
// logical grid origin, so the grid and all separate sprites share one transform.
export const MAIN_ISLAND_ART = {
  source: require('../../assets/isometric/starter-island.png'),
  width: 1482,
  height: 2223,
  gridOriginX: 741,
  gridOriginY: 955,
} as const;

// Visual calibration only; placement cells and saved grid coordinates remain
// on the same tile scale while the logical grid grows to 52 × 52.
export const MAIN_ISLAND_GRID: Pick<IsoGridMetrics, 'tileWidth' | 'tileHeight'> = {
  tileWidth: 26,
  tileHeight: 12.5,
};
