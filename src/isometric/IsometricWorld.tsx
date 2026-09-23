import { Canvas, Circle, Fill, Group, Image as SkiaImage, Path, Skia, useImage } from '@shopify/react-native-skia';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  PanResponder,
  StyleSheet,
  View,
  type GestureResponderEvent,
} from 'react-native';

import {
  GRID_CONFIG,
  PLAYABLE_GRID_CELLS,
  getPlacementCells,
  isPlayableCell,
  validatePlacement,
  type BuildingDraft,
  type BuildingPlacement,
  type GridCell,
} from '../island/placementGrid';
import {
  clampIsoPan,
  getFootprintGroundAnchor,
  screenToGridCell,
  type IsoGridMetrics,
  type IsoViewport,
} from './isometricMath';
import { DEFAULT_BACKGROUND_ID, getBackground, type BackgroundId } from './backgroundCatalog';
import { getBackgroundFrame } from './backgroundParallax';
import {
  getBuildDragGrabOffset,
  getDraggedPlacementOrigin,
  getInitialBuildGestureMode,
  getPlacedBuildingAtPoint,
  getPlacedPressAction,
  PLACED_BUILDING_LONG_PRESS_MS,
  PLACED_BUILDING_PRESS_TOLERANCE,
} from './buildDrag';
import { MAIN_ISLAND_ART, MAIN_ISLAND_GRID } from './islandArt';
import { SpriteAssetLoader, SpriteLayer, type SettlingPlacement, type SpriteImages } from './SpriteLayer';
import { PlacementDustLayer } from './PlacementDustLayer';
import { PLACEMENT_DUST_SPRITE } from './placementDustSprite';
import { getIsoSpriteContactPoint, getPreviewLiftWorldY, ISO_SPRITES, sortIsoSprites, type IsoSpriteInstance, type SpriteCalibrationOverrides } from './spriteCatalog';
import type { BuildableType } from '../island/objectCatalog';

const ISO_GRID: IsoGridMetrics = {
  columns: GRID_CONFIG.columns,
  rows: GRID_CONFIG.rows,
  ...MAIN_ISLAND_GRID,
};
const MIN_ZOOM = 0.38;
const MAX_ZOOM = 2.9;
const INITIAL_ZOOM_FACTOR = 1.2;
// DEV-only ground-contact check; change to false to hide it without removing code.
const SHOW_PLACEMENT_ANCHORS = __DEV__;

type IsometricWorldProps = {
  placementMode: boolean;
  placedBuildings: BuildingPlacement[];
  previewBuilding: BuildingDraft | null;
  editingBuildingId: string | null;
  devSpriteCalibrations?: SpriteCalibrationOverrides;
  onPreviewCell: (cell: GridCell) => void;
  onPreviewDragCell: (cell: GridCell) => void;
  onEditBuilding: (buildingId: string) => void;
  onLongPressBuilding: (buildingId: string) => void;
  settlingPlacement?: SettlingPlacement | null;
  backgroundId?: BackgroundId;
};

type TouchSnapshot = { count: number; x: number; y: number; distance: number };
type GestureMode = 'building' | 'camera' | 'placed-press' | 'placed-cancelled' | 'after-multitouch';

function getTouchSnapshot(event: GestureResponderEvent): TouchSnapshot | null {
  const touches = event.nativeEvent.touches;
  if (!touches.length) return null;
  const first = touches[0];
  const second = touches[1];
  return {
    count: touches.length,
    x: second ? (first.pageX + second.pageX) / 2 : first.pageX,
    y: second ? (first.pageY + second.pageY) / 2 : first.pageY,
    distance: second ? Math.hypot(first.pageX - second.pageX, first.pageY - second.pageY) : 0,
  };
}

function diamondPath(cell: GridCell): string {
  const { x, y } = getFootprintGroundAnchor(cell, { width: 1, height: 1 }, ISO_GRID);
  const halfWidth = ISO_GRID.tileWidth / 2;
  const halfHeight = ISO_GRID.tileHeight / 2;
  return `M ${x} ${y - halfHeight} L ${x + halfWidth} ${y} L ${x} ${y + halfHeight} L ${x - halfWidth} ${y} Z`;
}

function playableBoundaryPath(): string {
  const halfWidth = ISO_GRID.tileWidth / 2;
  const halfHeight = ISO_GRID.tileHeight / 2;
  const segments: string[] = [];

  for (const cell of PLAYABLE_GRID_CELLS) {
    const { x, y } = getFootprintGroundAnchor(cell, { width: 1, height: 1 }, ISO_GRID);
    const top = `${x} ${y - halfHeight}`;
    const right = `${x + halfWidth} ${y}`;
    const bottom = `${x} ${y + halfHeight}`;
    const left = `${x - halfWidth} ${y}`;
    if (!isPlayableCell({ gridX: cell.gridX - 1, gridY: cell.gridY })) segments.push(`M ${top} L ${left}`);
    if (!isPlayableCell({ gridX: cell.gridX, gridY: cell.gridY - 1 })) segments.push(`M ${top} L ${right}`);
    if (!isPlayableCell({ gridX: cell.gridX + 1, gridY: cell.gridY })) segments.push(`M ${right} L ${bottom}`);
    if (!isPlayableCell({ gridX: cell.gridX, gridY: cell.gridY + 1 })) segments.push(`M ${bottom} L ${left}`);
  }

  return segments.join(' ');
}

export function IsometricWorld({
  placementMode,
  placedBuildings,
  previewBuilding,
  editingBuildingId,
  devSpriteCalibrations,
  onPreviewCell,
  onPreviewDragCell,
  onEditBuilding,
  onLongPressBuilding,
  settlingPlacement,
  backgroundId = DEFAULT_BACKGROUND_ID,
}: IsometricWorldProps) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const sizeRef = useRef(size);
  const [transform, setTransform] = useState({ panX: 0, panY: 0, zoom: 0.54 });
  const transformRef = useRef(transform);
  const [spriteImages, setSpriteImages] = useState<SpriteImages>({});
  const lastTouch = useRef<TouchSnapshot | null>(null);
  const gestureMode = useRef<GestureMode>('camera');
  const grabOffset = useRef<{ x: number; y: number } | null>(null);
  const draggedCell = useRef<GridCell | null>(null);
  const touchPageOrigin = useRef({ x: 0, y: 0 });
  const pressStart = useRef<{ x: number; y: number; time: number; travel: number } | null>(null);
  const pressedBuilding = useRef<BuildingPlacement | null>(null);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gestureContext = useRef({ placementMode, previewBuilding, placedBuildings, devSpriteCalibrations });
  gestureContext.current = { placementMode, previewBuilding, placedBuildings, devSpriteCalibrations };
  const onPreviewDragCellRef = useRef(onPreviewDragCell);
  onPreviewDragCellRef.current = onPreviewDragCell;
  const onEditBuildingRef = useRef(onEditBuilding);
  onEditBuildingRef.current = onEditBuilding;
  const onLongPressBuildingRef = useRef(onLongPressBuilding);
  onLongPressBuildingRef.current = onLongPressBuilding;
  const activatePlacedMove = useRef<(building: BuildingPlacement, point: { x: number; y: number }) => void>(() => {});
  activatePlacedMove.current = (building, point) => {
    if (!gestureContext.current.placedBuildings.some((placed) => placed.id === building.id)) return;
    const draft: BuildingDraft = {
      type: building.type,
      gridX: building.gridX,
      gridY: building.gridY,
      rotationQuarterTurns: building.rotationQuarterTurns,
    };
    const viewport = {
      centerX: sizeRef.current.width / 2,
      centerY: sizeRef.current.height / 2,
      ...transformRef.current,
    };
    grabOffset.current = getBuildDragGrabOffset(point, draft, ISO_GRID, viewport);
    draggedCell.current = { gridX: draft.gridX, gridY: draft.gridY };
    gestureMode.current = 'building';
    gestureContext.current = { ...gestureContext.current, placementMode: true, previewBuilding: draft };
    onLongPressBuildingRef.current(building.id);
  };
  const usedMultipleTouches = useRef(false);
  const didFit = useRef(false);

  useEffect(() => () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
  }, []);

  const backgroundImage = useImage(getBackground(backgroundId).source);
  const islandImage = useImage(MAIN_ISLAND_ART.source);
  const placementDustImage = useImage(PLACEMENT_DUST_SPRITE.source);
  const playableBoundary = useMemo(() => Skia.Path.MakeFromSVGString(playableBoundaryPath()), []);
  const gridLines = useMemo(() => placementMode
    ? Skia.Path.MakeFromSVGString(PLAYABLE_GRID_CELLS.map(diamondPath).join(' '))
    : null, [placementMode]);
  const previewValid = previewBuilding
    ? validatePlacement(previewBuilding, placedBuildings, editingBuildingId).valid
    : false;
  const selectedBuilding = SHOW_PLACEMENT_ANCHORS && editingBuildingId
    ? placedBuildings.find((building) => building.id === editingBuildingId) ?? null
    : null;
  const activeBuilding = placementMode ? previewBuilding : selectedBuilding;
  const activeCells = activeBuilding ? getPlacementCells(activeBuilding) : [];
  const activeCellPath = activeCells.length
    ? Skia.Path.MakeFromSVGString(activeCells.map(diamondPath).join(' '))
    : null;
  // Independent centroid of the ACTUAL drawn cell centers, for the DEV overlay.
  const footprintCenter = activeCells.length ? activeCells.reduce((sum, cell) => {
    const center = getFootprintGroundAnchor(cell, { width: 1, height: 1 }, ISO_GRID);
    return { x: sum.x + center.x / activeCells.length, y: sum.y + center.y / activeCells.length };
  }, { x: 0, y: 0 }) : null;
  const previewLiftWorldY = getPreviewLiftWorldY(transform.zoom);
  const spriteContact = activeBuilding ? getIsoSpriteContactPoint(activeBuilding, ISO_GRID, devSpriteCalibrations) : null;
  const renderedSpriteContact = spriteContact && placementMode && previewBuilding
    ? { ...spriteContact, y: spriteContact.y + previewLiftWorldY }
    : spriteContact;
  const spriteInstances = useMemo(() => {
    const instances: IsoSpriteInstance[] = placedBuildings
      .filter((building) => !placementMode || building.id !== editingBuildingId);
    if (placementMode && previewBuilding) {
      instances.push({ ...previewBuilding, id: 'placement-preview', opacity: 0.65, invalid: !previewValid, preview: true });
    }
    return sortIsoSprites(instances);
  }, [editingBuildingId, placedBuildings, placementMode, previewBuilding, previewValid]);
  const onSpriteLoaded = useRef((type: BuildableType, image: NonNullable<SpriteImages[BuildableType]>) => {
    setSpriteImages((current) => current[type] === image ? current : { ...current, [type]: image });
  }).current;

  const onTapRef = useRef<(x: number, y: number) => void>(() => {});
  onTapRef.current = (x, y) => {
    const cell = screenToGridCell({ x, y }, ISO_GRID, {
      centerX: sizeRef.current.width / 2,
      centerY: sizeRef.current.height / 2,
      ...transformRef.current,
    });
    if (!isPlayableCell(cell)) return;
    if (placementMode) {
      onPreviewCell(cell);
      return;
    }
    const existing = placedBuildings.find((building) => getPlacementCells(building).some(
      (occupied) => occupied.gridX === cell.gridX && occupied.gridY === cell.gridY,
    ));
    if (existing) {
      onEditBuilding(existing.id);
      return;
    }
  };

  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (event) => {
      const touch = getTouchSnapshot(event);
      lastTouch.current = touch;
      usedMultipleTouches.current = (touch?.count ?? 0) > 1;
      gestureMode.current = 'camera';
      grabOffset.current = null;
      draggedCell.current = null;
      pressStart.current = null;
      pressedBuilding.current = null;
      if (pressTimer.current) clearTimeout(pressTimer.current);
      pressTimer.current = null;
      if (!touch) return;
      touchPageOrigin.current = {
        x: touch.x - event.nativeEvent.locationX,
        y: touch.y - event.nativeEvent.locationY,
      };
      const { placementMode: placing, previewBuilding: preview, placedBuildings: placed, devSpriteCalibrations: calibrations } = gestureContext.current;
      if (touch.count !== 1) return;
      const point = { x: event.nativeEvent.locationX, y: event.nativeEvent.locationY };
      const viewport = {
        centerX: sizeRef.current.width / 2,
        centerY: sizeRef.current.height / 2,
        ...transformRef.current,
      };
      if (placing && preview) {
        gestureMode.current = getInitialBuildGestureMode(point, touch.count, preview, ISO_GRID, viewport, calibrations);
        if (gestureMode.current === 'building') {
          grabOffset.current = getBuildDragGrabOffset(point, preview, ISO_GRID, viewport);
          draggedCell.current = { gridX: preview.gridX, gridY: preview.gridY };
        }
        return;
      }
      if (!placing) {
        const building = getPlacedBuildingAtPoint(point, placed, ISO_GRID, viewport, calibrations);
        if (building) {
          gestureMode.current = 'placed-press';
          pressedBuilding.current = building;
          pressStart.current = { x: touch.x, y: touch.y, time: Date.now(), travel: 0 };
          pressTimer.current = setTimeout(() => {
            pressTimer.current = null;
            const start = pressStart.current;
            const target = pressedBuilding.current;
            const latest = lastTouch.current;
            if (gestureMode.current !== 'placed-press' || !start || !target || latest?.count !== 1) return;
            if (getPlacedPressAction(Date.now() - start.time, start.travel, latest.count) === 'move') {
              activatePlacedMove.current(target, {
                x: latest.x - touchPageOrigin.current.x,
                y: latest.y - touchPageOrigin.current.y,
              });
            }
          }, PLACED_BUILDING_LONG_PRESS_MS);
        }
      }
    },
    onPanResponderMove: (event) => {
      const next = getTouchSnapshot(event);
      const previous = lastTouch.current;
      lastTouch.current = next;
      if ((next?.count ?? 0) > 1) {
        if (pressTimer.current) clearTimeout(pressTimer.current);
        pressTimer.current = null;
        pressedBuilding.current = null;
        usedMultipleTouches.current = true;
        gestureMode.current = 'camera';
        grabOffset.current = null;
        draggedCell.current = null;
      } else if (usedMultipleTouches.current && next?.count === 1) {
        gestureMode.current = 'after-multitouch';
      }
      if (!next || !previous || next.count !== previous.count) return;
      if (gestureMode.current === 'placed-press' && next.count === 1 && pressStart.current) {
        const start = pressStart.current;
        start.travel = Math.max(start.travel, Math.hypot(next.x - start.x, next.y - start.y));
        if (start.travel > PLACED_BUILDING_PRESS_TOLERANCE) {
          if (pressTimer.current) clearTimeout(pressTimer.current);
          pressTimer.current = null;
          gestureMode.current = 'placed-cancelled';
        }
        return;
      }
      if (gestureMode.current === 'placed-cancelled') return;
      if (gestureMode.current === 'building' && next.count === 1 && grabOffset.current) {
        const preview = gestureContext.current.previewBuilding;
        if (!preview) return;
        const point = {
          x: next.x - touchPageOrigin.current.x,
          y: next.y - touchPageOrigin.current.y,
        };
        const viewport = {
          centerX: sizeRef.current.width / 2,
          centerY: sizeRef.current.height / 2,
          ...transformRef.current,
        };
        const cell = getDraggedPlacementOrigin(point, grabOffset.current, preview, ISO_GRID, viewport);
        if (cell.gridX !== draggedCell.current?.gridX || cell.gridY !== draggedCell.current?.gridY) {
          draggedCell.current = cell;
          onPreviewDragCellRef.current(cell);
        }
        return;
      }
      if (gestureMode.current !== 'camera') return;
      const current = transformRef.current;
      const deltaX = next.x - previous.x;
      const deltaY = next.y - previous.y;
      let zoom = current.zoom;
      let panX = current.panX + deltaX;
      let panY = current.panY + deltaY;
      if (next.count > 1 && previous.distance > 4 && next.distance > 4) {
        zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, current.zoom * next.distance / previous.distance));
        const ratio = zoom / current.zoom;
        // Keep the area under the pinch midpoint approximately anchored.
        panX += (1 - ratio) * (previous.x - sizeRef.current.width / 2 - current.panX);
        panY += (1 - ratio) * (previous.y - sizeRef.current.height / 2 - current.panY);
      }
      const proposed = {
        zoom,
        panX,
        panY,
      };
      const { panX: boundedX, panY: boundedY } = clampIsoPan({
        ...proposed,
        centerX: sizeRef.current.width / 2,
        centerY: sizeRef.current.height / 2,
      }, ISO_GRID);
      const updated = { ...proposed, panX: boundedX, panY: boundedY };
      transformRef.current = updated;
      setTransform(updated);
    },
    onPanResponderRelease: (event, gestureState) => {
      if (pressTimer.current) clearTimeout(pressTimer.current);
      pressTimer.current = null;
      if (gestureMode.current === 'placed-press' && pressedBuilding.current && pressStart.current) {
        const start = pressStart.current;
        const travel = Math.max(start.travel, Math.hypot(gestureState.dx, gestureState.dy));
        const action = getPlacedPressAction(Date.now() - start.time, travel, 1);
        if (action === 'select') onEditBuildingRef.current(pressedBuilding.current.id);
        if (action === 'move') activatePlacedMove.current(pressedBuilding.current, {
          x: event.nativeEvent.locationX,
          y: event.nativeEvent.locationY,
        });
      }
      if (gestureMode.current === 'camera' && !usedMultipleTouches.current
        && Math.hypot(gestureState.dx, gestureState.dy) < 8) {
        onTapRef.current(event.nativeEvent.locationX, event.nativeEvent.locationY);
      }
      lastTouch.current = null;
      grabOffset.current = null;
      draggedCell.current = null;
      pressStart.current = null;
      pressedBuilding.current = null;
      gestureMode.current = 'camera';
      usedMultipleTouches.current = false;
    },
    onPanResponderTerminate: () => {
      if (pressTimer.current) clearTimeout(pressTimer.current);
      pressTimer.current = null;
      lastTouch.current = null;
      grabOffset.current = null;
      draggedCell.current = null;
      pressStart.current = null;
      pressedBuilding.current = null;
      gestureMode.current = 'camera';
      usedMultipleTouches.current = false;
    },
    onPanResponderTerminationRequest: () => true,
  }), []);

  const viewport: IsoViewport = {
    centerX: size.width / 2,
    centerY: size.height / 2,
    ...transform,
  };
  const backgroundFrame = getBackgroundFrame(size.width, size.height, transform.panX, transform.panY);

  return (
    <View
      style={StyleSheet.absoluteFill}
      onLayout={(event) => {
        const nextSize = event.nativeEvent.layout;
        sizeRef.current = nextSize;
        setSize(nextSize);
        if (!didFit.current && nextSize.width > 0) {
          didFit.current = true;
          const previousFit = Math.min(0.55, Math.max(MIN_ZOOM, nextSize.width / MAIN_ISLAND_ART.width * 1.25));
          const fitted = { ...transformRef.current, zoom: Math.min(MAX_ZOOM, previousFit * INITIAL_ZOOM_FACTOR) };
          transformRef.current = fitted;
          setTransform(fitted);
        }
      }}
      {...responder.panHandlers}
    >
      {(Object.entries(ISO_SPRITES) as Array<[BuildableType, typeof ISO_SPRITES[BuildableType]]>)
        .map(([type, definition]) => (
          <SpriteAssetLoader key={type} type={type} source={definition.source} onLoad={onSpriteLoaded} />
        ))}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Canvas style={StyleSheet.absoluteFill}>
          <Fill color="#8ABBE3" />
          {backgroundImage ? (
            <SkiaImage image={backgroundImage} {...backgroundFrame} fit="cover" />
          ) : null}
          <Group transform={[{ translateX: viewport.centerX + viewport.panX }, { translateY: viewport.centerY + viewport.panY }]}>
            <Group transform={[{ scale: viewport.zoom }]}>
              {islandImage ? (
                <SkiaImage
                  image={islandImage}
                  x={-MAIN_ISLAND_ART.gridOriginX}
                  y={-MAIN_ISLAND_ART.gridOriginY}
                  width={MAIN_ISLAND_ART.width}
                  height={MAIN_ISLAND_ART.height}
                  fit="contain"
                />
              ) : null}
              {playableBoundary ? (
                <Path
                  path={playableBoundary}
                  color="#F1F8D9"
                  style="stroke"
                  strokeWidth={(placementMode ? 1.35 : 0.8) / viewport.zoom}
                  opacity={placementMode ? 0.68 : 0.28}
                />
              ) : null}
              {placementMode && gridLines ? (
                <Path
                  path={gridLines}
                  color="#EAF7D9"
                  style="stroke"
                  strokeWidth={0.55}
                  opacity={0.18}
                />
              ) : null}
              {activeCellPath ? (
                <>
                  <Path path={activeCellPath} color={!placementMode || previewValid ? '#AEE6B4' : '#E69E9A'} opacity={0.38} />
                  <Path path={activeCellPath} color={!placementMode || previewValid ? '#F0FFE6' : '#FFDBD6'} style="stroke" strokeWidth={1.15} opacity={0.9} />
                </>
              ) : null}
            </Group>
          </Group>
          <PlacementDustLayer
            image={placementDustImage}
            settlingPlacement={settlingPlacement}
            placedBuildings={placedBuildings}
            grid={ISO_GRID}
            viewport={viewport}
            layer="back"
          />
          <Group transform={[{ translateX: viewport.centerX + viewport.panX }, { translateY: viewport.centerY + viewport.panY }]}> 
            <Group transform={[{ scale: viewport.zoom }]}> 
              <SpriteLayer instances={spriteInstances} grid={ISO_GRID} images={spriteImages} devSpriteCalibrations={devSpriteCalibrations} previewLiftWorldY={previewLiftWorldY} settlingPlacement={settlingPlacement} />
              {SHOW_PLACEMENT_ANCHORS && footprintCenter && renderedSpriteContact ? (
                <>
                  {Math.hypot(footprintCenter.x - renderedSpriteContact.x, footprintCenter.y - renderedSpriteContact.y) > 0.1 ? (
                    <Path path={`M ${footprintCenter.x} ${footprintCenter.y} L ${renderedSpriteContact.x} ${renderedSpriteContact.y}`} color="#FFE16A" style="stroke" strokeWidth={1.5} />
                  ) : null}
                  <Circle cx={renderedSpriteContact.x} cy={renderedSpriteContact.y} r={5.5} color="#FF63D8" style="stroke" strokeWidth={1.8} />
                  <Circle cx={footprintCenter.x} cy={footprintCenter.y} r={2.5} color="#42F2B1" />
                </>
              ) : null}
            </Group>
          </Group>
          <PlacementDustLayer
            image={placementDustImage}
            settlingPlacement={settlingPlacement}
            placedBuildings={placedBuildings}
            grid={ISO_GRID}
            viewport={viewport}
            layer="front"
          />
        </Canvas>
      </View>
    </View>
  );
}
