import {
  LEGACY_OBJECT_DEFINITIONS,
  isBuildableType,
  type BuildableType,
  type PlaceableType,
} from '../island/objectCatalog';
import {
  getPlacementCells,
  getRotatedFootprint,
  type BuildingDraft,
} from '../island/placementGrid';
import { getFootprintGroundAnchor, type IsoGridMetrics } from './isometricMath';

export type IsoSpriteDefinition = {
  id: BuildableType;
  source: number;
  renderSize: { width: number; height: number };
  anchor: { x: number; y: number }; // normalized ground-contact point in the PNG
  depthOffset: number;
  // Future visual levels can add sources here without changing placement data.
  upgradeSources?: Readonly<Partial<Record<number, number>>>;
};

export type IsoSpriteInstance = BuildingDraft & {
  id: string;
  opacity?: number;
  invalid?: boolean;
  preview?: boolean;
};

// Visual-only lift in screen points; divide by zoom inside the scaled world.
export const PREVIEW_LIFT_SCREEN_Y = -10;

export function getPreviewLiftWorldY(zoom: number): number {
  return Number.isFinite(zoom) && zoom > 0 ? PREVIEW_LIFT_SCREEN_Y / zoom : 0;
}

// Temporary DEV overrides use the same units as the permanent catalog values.
// Height follows width proportionally so the PNG's aspect ratio stays intact.
export type SpriteCalibration = {
  renderWidth: number;
  groundAnchorX: number;
  groundAnchorY: number;
};
export type SpriteCalibrationOverrides = Partial<Record<BuildableType, SpriteCalibration>>;

// World art metadata only. All current IDs intentionally use the same level-1
// art so old saves remain renderable without exposing the retired art direction.
export const ISO_SPRITES: Record<BuildableType, IsoSpriteDefinition> = {
  house1: {
    id: 'house1', source: require('../../assets/houses/house-level-1.png'),
    renderSize: { width: 118, height: 118 }, anchor: { x: 0.51, y: 0.86 }, depthOffset: 0,
  },
  house2: {
    id: 'house2', source: require('../../assets/houses/house-level-1.png'),
    renderSize: { width: 90, height: 90 }, anchor: { x: 0.51, y: 0.86 }, depthOffset: 0,
  },
  house3: {
    id: 'house3', source: require('../../assets/houses/house-level-1.png'),
    renderSize: { width: 90, height: 90 }, anchor: { x: 0.51, y: 0.86 }, depthOffset: 0,
  },
};

export function getSpriteDefinition(type: PlaceableType): IsoSpriteDefinition {
  return ISO_SPRITES[isBuildableType(type) ? type : LEGACY_OBJECT_DEFINITIONS[type].displayAs];
}

export function getDefaultSpriteCalibration(type: PlaceableType): SpriteCalibration {
  const definition = getSpriteDefinition(type);
  return {
    renderWidth: definition.renderSize.width,
    groundAnchorX: definition.anchor.x,
    groundAnchorY: definition.anchor.y,
  };
}

export function getSpriteCalibration(type: PlaceableType, overrides?: SpriteCalibrationOverrides): SpriteCalibration {
  const definition = getSpriteDefinition(type);
  const candidate = overrides?.[definition.id];
  return candidate
    && Number.isFinite(candidate.renderWidth) && candidate.renderWidth > 0
    && Number.isFinite(candidate.groundAnchorX) && candidate.groundAnchorX >= 0 && candidate.groundAnchorX <= 1
    && Number.isFinite(candidate.groundAnchorY) && candidate.groundAnchorY >= 0 && candidate.groundAnchorY <= 1
    ? candidate : getDefaultSpriteCalibration(type);
}

export function formatSpriteCalibration(type: PlaceableType, calibration: SpriteCalibration): string {
  const definition = getSpriteDefinition(type);
  const height = calibration.renderWidth * definition.renderSize.height / definition.renderSize.width;
  return `renderSize: { width: ${calibration.renderWidth.toFixed(1)}, height: ${height.toFixed(1)} }, anchor: { x: ${calibration.groundAnchorX.toFixed(2)}, y: ${calibration.groundAnchorY.toFixed(2)} }`;
}

export function getIsoSpritePosition(instance: BuildingDraft, grid: IsoGridMetrics) {
  const footprint = getRotatedFootprint(instance.type, instance.rotationQuarterTurns);
  return getFootprintGroundAnchor(instance, footprint, grid);
}

export function getIsoSpriteImageRect(instance: BuildingDraft, grid: IsoGridMetrics, overrides?: SpriteCalibrationOverrides) {
  const definition = getSpriteDefinition(instance.type);
  const groundAnchor = getIsoSpritePosition(instance, grid);
  const calibration = getSpriteCalibration(instance.type, overrides);
  const width = calibration.renderWidth;
  const height = width * definition.renderSize.height / definition.renderSize.width;
  return {
    x: groundAnchor.x - width * calibration.groundAnchorX,
    y: groundAnchor.y - height * calibration.groundAnchorY,
    width,
    height,
  };
}

export function getIsoSpriteRenderRect(
  instance: IsoSpriteInstance,
  grid: IsoGridMetrics,
  overrides?: SpriteCalibrationOverrides,
  previewLiftWorldY = 0,
) {
  const rect = getIsoSpriteImageRect(instance, grid, overrides);
  return instance.preview ? { ...rect, y: rect.y + previewLiftWorldY } : rect;
}

// The declared contact pixel in the rendered image; debug tooling compares it
// against the highlighted footprint center rather than trusting a visual guess.
export function getIsoSpriteContactPoint(instance: BuildingDraft, grid: IsoGridMetrics, overrides?: SpriteCalibrationOverrides) {
  const calibration = getSpriteCalibration(instance.type, overrides);
  const rect = getIsoSpriteImageRect(instance, grid, overrides);
  return {
    x: rect.x + rect.width * calibration.groundAnchorX,
    y: rect.y + rect.height * calibration.groundAnchorY,
  };
}

export function sortIsoSprites(instances: IsoSpriteInstance[]): IsoSpriteInstance[] {
  // Compute depth once per item; sorting 100+ items need not repeat footprint work.
  return instances.map((instance) => ({
    instance,
    depth: Math.max(...getPlacementCells(instance).map((cell) => cell.gridX + cell.gridY))
      + getSpriteDefinition(instance.type).depthOffset,
  })).sort((a, b) => a.depth - b.depth
    || a.instance.gridX - b.instance.gridX
    || a.instance.gridY - b.instance.gridY
    || a.instance.id.localeCompare(b.instance.id))
    .map(({ instance }) => instance);
}
