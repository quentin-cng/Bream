import { Circle, Group, Image as SkiaImage, Path, RoundedRect, useImage, type SkImage } from '@shopify/react-native-skia';
import { useEffect, type ReactNode } from 'react';
import { cancelAnimation, Easing, useDerivedValue, useSharedValue, withTiming } from 'react-native-reanimated';

import type { BuildableType } from '../island/objectCatalog';
import type { IsoGridMetrics } from './isometricMath';
import { getPlacementSettlePose, PLACEMENT_SETTLE_DURATION_MS } from './placementSettle';
import {
  getIsoSpriteRenderRect,
  getIsoSpritePosition,
  getSpriteCalibration,
  getSpriteDefinition,
  type SpriteCalibrationOverrides,
  type IsoSpriteInstance,
} from './spriteCatalog';

export type SpriteImages = Partial<Record<BuildableType, SkImage>>;
export type SettlingPlacement = { id: string; token: number };

function PlacementSettle({ ground, liftWorldY, children }: {
  ground: { x: number; y: number };
  liftWorldY: number;
  children: ReactNode;
}) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withTiming(1, {
      duration: PLACEMENT_SETTLE_DURATION_MS,
      easing: Easing.out(Easing.cubic),
    });
    return () => {
      cancelAnimation(progress);
    };
  }, [progress]);
  const transform = useDerivedValue(() => {
    const pose = getPlacementSettlePose(progress.value, liftWorldY);
    return [{ translateY: pose.translateY }, { scale: pose.scale }];
  });
  return (
    <Group origin={ground} transform={transform}>{children}</Group>
  );
}

// One loader per distinct bundled art source, never one loader per placed item.
export function SpriteAssetLoader({ type, source, onLoad }: {
  type: BuildableType;
  source: number;
  onLoad: (type: BuildableType, image: SkImage) => void;
}) {
  const image = useImage(source);
  useEffect(() => {
    if (image) onLoad(type, image);
  }, [image, onLoad, type]);
  return null;
}

function placeholderHouse(width: number, height: number, invalid: boolean) {
  const wall = invalid ? '#D99A98' : '#F4E6C8';
  const roof = invalid ? '#BF6969' : '#D98F73';
  const top = -height;
  const base = 0;
  const wallTop = top + height * 0.38;
  return (
    <>
      <Circle cx={0} cy={base + 1} r={width * 0.39} color="#344F4B" opacity={0.22} />
      <RoundedRect x={-width * 0.35} y={wallTop} width={width * 0.7} height={-wallTop} r={3} color={wall} />
      <Path
        path={`M ${-width * 0.46} ${wallTop + 2} L 0 ${top + 2} L ${width * 0.46} ${wallTop + 2} L ${width * 0.34} ${wallTop + 6} L 0 ${top + height * 0.16} L ${-width * 0.34} ${wallTop + 6} Z`}
        color={roof}
      />
      <RoundedRect x={-width * 0.08} y={-height * 0.25} width={width * 0.16} height={height * 0.25} r={2} color="#917160" />
      <RoundedRect x={-width * 0.28} y={-height * 0.3} width={width * 0.14} height={height * 0.13} r={1} color="#A5D3D8" />
      <RoundedRect x={width * 0.14} y={-height * 0.3} width={width * 0.14} height={height * 0.13} r={1} color="#A5D3D8" />
    </>
  );
}

export function SpriteLayer({ instances, grid, images, devSpriteCalibrations, previewLiftWorldY, settlingPlacement }: {
  instances: IsoSpriteInstance[];
  grid: IsoGridMetrics;
  images: SpriteImages;
  devSpriteCalibrations?: SpriteCalibrationOverrides;
  previewLiftWorldY: number;
  settlingPlacement?: SettlingPlacement | null;
}) {
  return <>{instances.map((instance) => {
    const definition = getSpriteDefinition(instance.type);
    const rect = getIsoSpriteRenderRect(instance, grid, devSpriteCalibrations, previewLiftWorldY);
    const calibration = getSpriteCalibration(instance.type, devSpriteCalibrations);
    const { width, height } = rect;
    const image = images[definition.id];
    const sprite = (
      <Group
        key={instance.id}
        opacity={instance.opacity ?? 1}
      >
        {image ? (
          <SkiaImage
            image={image}
            x={rect.x}
            y={rect.y}
            width={width}
            height={height}
            fit="contain"
          />
        ) : (
          <Group transform={[{ translateX: rect.x + width * calibration.groundAnchorX }, { translateY: rect.y + height * calibration.groundAnchorY }]}>
            {placeholderHouse(width, height, Boolean(instance.invalid))}
          </Group>
        )}
      </Group>
    );
    return settlingPlacement?.id === instance.id && !instance.preview ? (
      <PlacementSettle
        key={`${instance.id}-${settlingPlacement.token}`}
        ground={getIsoSpritePosition(instance, grid)}
        liftWorldY={previewLiftWorldY}
      >
        {sprite}
      </PlacementSettle>
    ) : sprite;
  })}</>;
}
