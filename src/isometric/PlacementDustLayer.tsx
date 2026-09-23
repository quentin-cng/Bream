import { Atlas, Group, Skia, type SkImage } from '@shopify/react-native-skia';
import { useEffect } from 'react';
import { cancelAnimation, Easing, useDerivedValue, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { getRotatedFootprint, type BuildingPlacement } from '../island/placementGrid';
import type { IsoGridMetrics, IsoViewport } from './isometricMath';
import { isoToScreen } from './isometricMath';
import {
  getPlacementDustFrameIndex,
  getPlacementDustFramePose,
  getPlacementDustFrontBand,
  PLACEMENT_DUST_SPRITE,
} from './placementDustSprite';
import { getIsoSpritePosition } from './spriteCatalog';
import type { SettlingPlacement } from './SpriteLayer';

function ActivePlacementDust({ image, building, grid, viewport, layer }: {
  image: SkImage;
  building: BuildingPlacement;
  grid: IsoGridMetrics;
  viewport: IsoViewport;
  layer: 'back' | 'front';
}) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withDelay(PLACEMENT_DUST_SPRITE.delayMs, withTiming(1, {
      duration: PLACEMENT_DUST_SPRITE.durationMs,
      easing: Easing.linear,
    }));
    return () => cancelAnimation(progress);
  }, [progress]);

  const footprint = getRotatedFootprint(building.type, building.rotationQuarterTurns);
  const screenGround = isoToScreen(getIsoSpritePosition(building, grid), viewport);
  const sources = PLACEMENT_DUST_SPRITE.frames.map((frame) =>
    Skia.XYWHRect(frame.x, frame.y, frame.width, frame.height));
  const destinations = PLACEMENT_DUST_SPRITE.frames.map((_, index) => {
    const pose = getPlacementDustFramePose(index, screenGround, footprint, viewport.zoom);
    return Skia.RSXform(pose.scale, 0, pose.x, pose.y);
  });
  const activeSource = useDerivedValue(() => [sources[getPlacementDustFrameIndex(progress.value)]]);
  const activeDestination = useDerivedValue(() => [destinations[getPlacementDustFrameIndex(progress.value)]]);
  const opacity = useDerivedValue(() => progress.value > 0 && progress.value < 1 ? 1 : 0);

  return (
    <Group clip={layer === 'front' ? getPlacementDustFrontBand(screenGround, footprint, viewport.zoom) : undefined} opacity={opacity}>
      <Atlas image={image} sprites={activeSource} transforms={activeDestination} />
    </Group>
  );
}

export function PlacementDustLayer({ image, settlingPlacement, placedBuildings, grid, viewport, layer }: {
  image: SkImage | null;
  settlingPlacement?: SettlingPlacement | null;
  placedBuildings: BuildingPlacement[];
  grid: IsoGridMetrics;
  viewport: IsoViewport;
  layer: 'back' | 'front';
}) {
  if (!image || !settlingPlacement) return null;
  const building = placedBuildings.find((candidate) => candidate.id === settlingPlacement.id);
  if (!building) return null;
  return (
    <ActivePlacementDust
      key={`${building.id}-${settlingPlacement.token}-${layer}`}
      image={image}
      building={building}
      grid={grid}
      viewport={viewport}
      layer={layer}
    />
  );
}
