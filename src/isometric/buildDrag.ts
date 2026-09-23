import { getRotatedFootprint, type BuildingDraft, type BuildingPlacement, type GridCell } from '../island/placementGrid';
import {
  isoToGrid,
  isoToScreen,
  screenToIso,
  type IsoGridMetrics,
  type IsoPoint,
  type IsoViewport,
} from './isometricMath';
import {
  getIsoSpritePosition,
  getIsoSpriteRenderRect,
  getPreviewLiftWorldY,
  sortIsoSprites,
  type SpriteCalibrationOverrides,
} from './spriteCatalog';

const PREVIEW_HIT_SLOP = 8;
export const PLACED_BUILDING_LONG_PRESS_MS = 420;
export const PLACED_BUILDING_PRESS_TOLERANCE = 8;

export function getPlacedPressAction(elapsedMs: number, travel: number, touchCount: number): 'select' | 'move' | 'none' {
  if (touchCount !== 1 || travel > PLACED_BUILDING_PRESS_TOLERANCE) return 'none';
  return elapsedMs >= PLACED_BUILDING_LONG_PRESS_MS ? 'move' : 'select';
}

function isPointInsideSpriteRect(point: IsoPoint, rect: { x: number; y: number; width: number; height: number }, viewport: IsoViewport): boolean {
  const topLeft = isoToScreen({ x: rect.x, y: rect.y }, viewport);
  const width = rect.width * viewport.zoom;
  const height = rect.height * viewport.zoom;
  return point.x >= topLeft.x - PREVIEW_HIT_SLOP
    && point.x <= topLeft.x + width + PREVIEW_HIT_SLOP
    && point.y >= topLeft.y - PREVIEW_HIT_SLOP
    && point.y <= topLeft.y + height + PREVIEW_HIT_SLOP;
}

// Frontmost painted sprite wins when art overlaps. This is a touch target only;
// occupancy and saved grid coordinates still come from placementGrid.
export function getPlacedBuildingAtPoint(
  point: IsoPoint,
  placements: BuildingPlacement[],
  grid: IsoGridMetrics,
  viewport: IsoViewport,
  calibrations?: SpriteCalibrationOverrides,
): BuildingPlacement | null {
  const frontToBack = sortIsoSprites(placements).reverse();
  for (const placement of frontToBack) {
    if (isPointInsideSpriteRect(point, getIsoSpriteRenderRect(placement, grid, calibrations), viewport)) return placement;
  }
  return null;
}

// The painted preview is lifted, so hit-test that rendered rectangle rather
// than its ground footprint. The transparent PNG border is intentionally part
// of the forgiving touch target; it does not affect placement coordinates.
export function isPointOnPreviewSprite(
  point: IsoPoint,
  draft: BuildingDraft,
  grid: IsoGridMetrics,
  viewport: IsoViewport,
  calibrations?: SpriteCalibrationOverrides,
): boolean {
  const rect = getIsoSpriteRenderRect(
    { ...draft, id: 'preview-hit-target', preview: true },
    grid,
    calibrations,
    getPreviewLiftWorldY(viewport.zoom),
  );
  return isPointInsideSpriteRect(point, rect, viewport);
}

// Decide ownership once at touch-down. Crossing the sprite boundary later
// cannot turn a camera gesture into a building drag (or the reverse).
export function getInitialBuildGestureMode(
  point: IsoPoint,
  touchCount: number,
  draft: BuildingDraft | null,
  grid: IsoGridMetrics,
  viewport: IsoViewport,
  calibrations?: SpriteCalibrationOverrides,
): 'building' | 'camera' {
  return touchCount === 1 && draft && isPointOnPreviewSprite(point, draft, grid, viewport, calibrations)
    ? 'building' : 'camera';
}

// Record the finger's displacement from the canonical ground anchor, never
// from the preview's visual lift. Moving the finger then moves that same anchor.
export function getBuildDragGrabOffset(
  point: IsoPoint,
  draft: BuildingDraft,
  grid: IsoGridMetrics,
  viewport: IsoViewport,
): IsoPoint {
  const anchor = isoToScreen(getIsoSpritePosition(draft, grid), viewport);
  return { x: point.x - anchor.x, y: point.y - anchor.y };
}

export function getDraggedPlacementOrigin(
  point: IsoPoint,
  grabOffset: IsoPoint,
  draft: BuildingDraft,
  grid: IsoGridMetrics,
  viewport: IsoViewport,
): GridCell {
  const anchor = screenToIso({ x: point.x - grabOffset.x, y: point.y - grabOffset.y }, viewport);
  const continuous = isoToGrid(anchor, grid);
  const footprint = getRotatedFootprint(draft.type, draft.rotationQuarterTurns);
  return {
    gridX: Math.round(continuous.gridX - (footprint.width - 1) / 2),
    gridY: Math.round(continuous.gridY - (footprint.height - 1) / 2),
  };
}
