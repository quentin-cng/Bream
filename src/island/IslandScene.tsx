import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber/native';
import {
  Suspense,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  type RefObject,
} from 'react';
import { AppState, PanResponder, StyleSheet, View, type GestureResponderEvent } from 'react-native';
import {
  BackSide,
  Color,
  DoubleSide,
  InstancedMesh,
  LinearFilter,
  MathUtils,
  Mesh,
  Object3D,
  PerspectiveCamera,
  RepeatWrapping,
  SRGBColorSpace,
  Texture,
  TextureLoader,
  UVMapping,
  Vector3,
} from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

import {
  GRID_CONFIG,
  PLAYABLE_GRID_CELLS,
  cellKey,
  getOccupiedCellKeys,
  gridCellToWorld,
  placementWorldPosition,
  validatePlacement,
  type BuildingDraft,
  type BuildingPlacement,
  type GridCell,
} from './placementGrid';
import { clampCameraFocus, panCameraFocus } from './cameraControls';
import { OBJECT_DEFINITIONS, type PlaceableType } from './objectCatalog';

// Three 0.180 expects a string userAgent when parsing GLTFs. React Native
// exposes navigator without that field, so provide the minimal missing value.
if (typeof navigator !== 'undefined' && !navigator.userAgent) {
  Object.defineProperty(navigator, 'userAgent', { value: 'React Native', configurable: true });
}

const worldModel = require('../../assets/models/floating_island_exp3.glb');
const worldGrassTexture = require('../../assets/models/floating_island_exp3_grass_2048.jpg');
const backgroundPanorama = require('../../assets/background/background_skybox_image.png');

// Keep camera tuning here so visual iteration doesn't affect the native UI.
const CAMERA = {
  fov: 75,
  elevation: MathUtils.degToRad(33),
  minElevation: MathUtils.degToRad(20),
  maxElevation: MathUtils.degToRad(60),
  initialZoom: 0.84,
  minZoom: 0.36,
  maxZoom: 1.75,
  damping: 18,
  orbitSensitivityX: 0.0062,
  orbitSensitivityY: 0.0042,
  inertiaOrbitDecay: 5.5,
  inertiaPanDecay: 6.5,
};

type CameraTarget = {
  azimuth: number;
  elevation: number;
  zoom: number;
  focusX: number;
  focusZ: number;
};
type CameraMotion = {
  active: boolean;
  azimuth: number;
  elevation: number;
  focusX: number;
  focusZ: number;
};
type TouchSnapshot = {
  count: number;
  x: number;
  y: number;
  distance: number;
  timestamp: number;
};

function snapshot(event: GestureResponderEvent): TouchSnapshot | null {
  const touches = event.nativeEvent.touches;
  if (!touches.length) return null;
  return {
    count: touches.length,
    x: touches.length > 1 ? (touches[0].pageX + touches[1].pageX) / 2 : touches[0].pageX,
    y: touches.length > 1 ? (touches[0].pageY + touches[1].pageY) / 2 : touches[0].pageY,
    distance: touches.length > 1
      ? Math.hypot(touches[0].pageX - touches[1].pageX, touches[0].pageY - touches[1].pageY)
      : 0,
    timestamp: event.nativeEvent.timestamp,
  };
}

function Island() {
  const { scene } = useLoader(GLTFLoader, worldModel) as GLTF;
  const compatibleGrassTexture = useLoader(
    TextureLoader,
    worldGrassTexture as unknown as string,
  );
  const preparedScene = useMemo(() => {
    compatibleGrassTexture.flipY = false;
    compatibleGrassTexture.colorSpace = SRGBColorSpace;
    compatibleGrassTexture.wrapS = RepeatWrapping;
    compatibleGrassTexture.wrapT = RepeatWrapping;
    compatibleGrassTexture.needsUpdate = true;
    scene.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((material) => {
        const texture = 'map' in material ? material.map as Texture | null : null;
        const image = texture?.image as { width?: number; height?: number } | undefined;
        if (!texture || Math.max(image?.width ?? 0, image?.height ?? 0) <= 2048) return;
        material.map = compatibleGrassTexture;
        material.needsUpdate = true;
      });
    });
    return scene;
  }, [compatibleGrassTexture, scene]);
  // The source asset is authored around an offset world origin. This only
  // recentres and scales the complete three-island composition; its geometry
  // and relative island positions remain untouched.
  return <primitive object={preparedScene} position={[-3.5, 17.4, -2.8]} scale={0.1} />;
}

function PanoramaBackground() {
  const texture = useLoader(
    TextureLoader,
    backgroundPanorama as unknown as string,
  );

  useEffect(() => {
    texture.mapping = UVMapping;
    texture.colorSpace = SRGBColorSpace;
    texture.generateMipmaps = false;
    texture.minFilter = LinearFilter;
    texture.needsUpdate = true;
  }, [texture]);

  return (
    <mesh rotation={[0, 0, 0]} renderOrder={-10}>
      <sphereGeometry args={[500, 32, 16]} />
      <meshBasicMaterial
        map={texture}
        side={BackSide}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}

type CatalogObjectProps = {
  type: PlaceableType;
  preview?: boolean;
  valid?: boolean;
};

function CatalogObject({ type, preview = false, valid = true }: CatalogObjectProps) {
  const definition = OBJECT_DEFINITIONS[type];
  const { scene } = useLoader(GLTFLoader, definition.asset) as GLTF;
  const preparedScene = useMemo(() => {
    const clone = scene.clone(true);
    const previewTint = new Color(valid ? '#BDE6C8' : '#D76F6A');
    clone.traverse((object) => {
      if (object instanceof Mesh && preview) {
        const sourceMaterials = Array.isArray(object.material)
          ? object.material
          : [object.material];
        const previewMaterials = sourceMaterials.map((sourceMaterial) => {
          const material = sourceMaterial.clone();
          material.transparent = true;
          material.opacity = 0.55;
          material.depthWrite = false;
          const color = (material as typeof material & { color?: Color }).color;
          if (color?.isColor) color.lerp(previewTint, 0.5);
          return material;
        });
        object.material = Array.isArray(object.material)
          ? previewMaterials
          : previewMaterials[0];
      }
      if (/collider/i.test(object.name)) object.visible = false;
    });
    return clone;
  }, [preview, scene, valid]);
  useEffect(() => () => {
    if (!preview) return;
    preparedScene.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((material) => material.dispose());
    });
  }, [preparedScene, preview]);
  const { visual } = definition;
  return (
    <group
      scale={visual.scale}
      rotation={[...visual.rotationOffset]}
    >
      <primitive
        object={preparedScene}
        position={[...visual.positionOffset]}
        dispose={null}
      />
    </group>
  );
}

function PlacedObject({ placement, preview = false, valid = true }: {
  placement: BuildingDraft;
  preview?: boolean;
  valid?: boolean;
}) {
  return (
    <group
      position={placementWorldPosition(placement)}
      rotation={[0, placement.rotationQuarterTurns * Math.PI / 2, 0]}
    >
      <CatalogObject type={placement.type} preview={preview} valid={valid} />
    </group>
  );
}

function CellInstances({ cells, color, opacity, radius }: {
  cells: GridCell[];
  color: string;
  opacity: number;
  radius: number;
}) {
  const mesh = useRef<InstancedMesh>(null);
  const transform = useMemo(() => {
    const value = new Object3D();
    value.rotation.x = -Math.PI / 2;
    return value;
  }, []);

  useLayoutEffect(() => {
    if (!mesh.current) return;
    cells.forEach((cell, index) => {
      transform.position.fromArray(gridCellToWorld(cell));
      transform.position.y += 0.012;
      transform.updateMatrix();
      mesh.current?.setMatrixAt(index, transform.matrix);
    });
    mesh.current.count = cells.length;
    mesh.current.instanceMatrix.needsUpdate = true;
  }, [cells, transform]);

  if (!cells.length) return null;
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, cells.length]} renderOrder={4}>
      <circleGeometry args={[radius, 12]} />
      <meshBasicMaterial
        color={color}
        side={DoubleSide}
        transparent
        opacity={opacity}
        depthWrite={false}
      />
    </instancedMesh>
  );
}

function PlacementLayer({ active, placedBuildings, previewBuilding, editingBuildingId }: {
  active: boolean;
  placedBuildings: BuildingPlacement[];
  previewBuilding: BuildingDraft | null;
  editingBuildingId: string | null;
}) {
  const occupiedCellKeys = useMemo(
    () => getOccupiedCellKeys(placedBuildings, editingBuildingId),
    [editingBuildingId, placedBuildings],
  );
  const previewValidity = useMemo(
    () => previewBuilding
      ? validatePlacement(previewBuilding, placedBuildings, editingBuildingId)
      : null,
    [editingBuildingId, placedBuildings, previewBuilding],
  );
  const previewCellKeys = useMemo(
    () => new Set(previewValidity?.cells.map(cellKey) ?? []),
    [previewValidity],
  );
  const availableCells = useMemo(
    () => PLAYABLE_GRID_CELLS.filter((cell) => (
      !occupiedCellKeys.has(cellKey(cell)) && !previewCellKeys.has(cellKey(cell))
    )),
    [occupiedCellKeys, previewCellKeys],
  );
  const occupiedCells = useMemo(
    () => PLAYABLE_GRID_CELLS.filter((cell) => occupiedCellKeys.has(cellKey(cell))),
    [occupiedCellKeys],
  );

  return (
    <>
      {active ? (
        <>
          <CellInstances
            cells={availableCells}
            color="#EAF7EE"
            opacity={0.24}
            radius={GRID_CONFIG.cellSize * 0.13}
          />
          <CellInstances
            cells={occupiedCells}
            color="#C98278"
            opacity={0.58}
            radius={GRID_CONFIG.cellSize * 0.3}
          />
          {previewValidity ? (
            <CellInstances
              cells={previewValidity.cells}
              color={previewValidity.valid ? '#FFF0AE' : '#D76F6A'}
              opacity={0.78}
              radius={GRID_CONFIG.cellSize * 0.4}
            />
          ) : null}
        </>
      ) : null}
      {placedBuildings
        .filter((building) => building.id !== editingBuildingId)
        .map((building) => <PlacedObject key={building.id} placement={building} />)}
      {active && previewBuilding ? (
        <PlacedObject
          placement={previewBuilding}
          preview
          valid={previewValidity?.valid ?? false}
        />
      ) : null}
    </>
  );
}

function CameraRig({ target, motion, wake }: {
  target: RefObject<CameraTarget>;
  motion: RefObject<CameraMotion>;
  wake: RefObject<() => void>;
}) {
  const { camera, size, invalidate, setFrameloop } = useThree();
  const current = useRef({ ...target.current });
  const lookAt = useMemo(() => new Vector3(), []);
  const nextPosition = useMemo(() => new Vector3(), []);

  useEffect(() => {
    const update = () => {
      const active = AppState.currentState === 'active';
      setFrameloop(active ? 'demand' : 'never');
      if (active) invalidate();
    };
    wake.current = () => {
      if (AppState.currentState === 'active') invalidate();
    };
    const subscription = AppState.addEventListener('change', update);
    update();
    return () => {
      subscription.remove();
      wake.current = () => {};
    };
  }, [invalidate, setFrameloop, wake]);

  useFrame((_, delta) => {
    const state = current.current;
    // Cap delta after idle/background so the first frame doesn't jump.
    const frameDelta = Math.min(delta, 1 / 30);
    const alpha = 1 - Math.exp(-CAMERA.damping * frameDelta);
    let moving = false;
    const velocity = motion.current;
    if (
      velocity.active
      && (
      Math.abs(velocity.azimuth) > 0.002
      || Math.abs(velocity.elevation) > 0.002
      || Math.abs(velocity.focusX) > 0.002
      || Math.abs(velocity.focusZ) > 0.002
      )
    ) {
      target.current.azimuth += velocity.azimuth * frameDelta;
      const nextElevation = MathUtils.clamp(
        target.current.elevation + velocity.elevation * frameDelta,
        CAMERA.minElevation,
        CAMERA.maxElevation,
      );
      if (nextElevation === CAMERA.minElevation || nextElevation === CAMERA.maxElevation) {
        velocity.elevation = 0;
      }
      target.current.elevation = nextElevation;
      const nextFocus = clampCameraFocus(
        target.current.focusX + velocity.focusX * frameDelta,
        target.current.focusZ + velocity.focusZ * frameDelta,
      );
      if (nextFocus.focusX === target.current.focusX) velocity.focusX = 0;
      if (nextFocus.focusZ === target.current.focusZ) velocity.focusZ = 0;
      target.current.focusX = nextFocus.focusX;
      target.current.focusZ = nextFocus.focusZ;
      const orbitDecay = Math.exp(-CAMERA.inertiaOrbitDecay * frameDelta);
      const panDecay = Math.exp(-CAMERA.inertiaPanDecay * frameDelta);
      velocity.azimuth *= orbitDecay;
      velocity.elevation *= orbitDecay;
      velocity.focusX *= panDecay;
      velocity.focusZ *= panDecay;
      moving = true;
    } else {
      velocity.active = false;
      velocity.azimuth = 0;
      velocity.elevation = 0;
      velocity.focusX = 0;
      velocity.focusZ = 0;
    }
    for (const key of ['azimuth', 'elevation', 'zoom', 'focusX', 'focusZ'] as const) {
      state[key] = MathUtils.lerp(state[key], target.current[key], alpha);
      if (Math.abs(state[key] - target.current[key]) > 0.0001) moving = true;
      else state[key] = target.current[key];
    }
    const aspect = size.width / Math.max(1, size.height);
    const perspective = camera as PerspectiveCamera;
    if (perspective.aspect !== aspect) {
      perspective.aspect = aspect;
      perspective.updateProjectionMatrix();
    }
    // Fit across narrow phones rather than assuming one screen's aspect ratio.
    const distance = Math.max(11, 3.9 / (Math.tan(MathUtils.degToRad(CAMERA.fov / 2)) * aspect)) * state.zoom;
    // Orbit around the playable surface rather than the island's underside.
    lookAt.set(state.focusX, GRID_CONFIG.surfaceY - 0.35, state.focusZ);
    nextPosition.set(
      distance * Math.cos(state.elevation) * Math.sin(state.azimuth),
      distance * Math.sin(state.elevation),
      distance * Math.cos(state.elevation) * Math.cos(state.azimuth),
    ).add(lookAt);
    camera.position.copy(nextPosition);
    camera.lookAt(lookAt);
    if (moving) invalidate();
  });

  return null;
}

type IslandSceneProps = {
  placementMode: boolean;
  placedBuildings: BuildingPlacement[];
  previewBuilding: BuildingDraft | null;
  editingBuildingId: string | null;
  onPreviewCell: (cell: GridCell) => void;
  onEditBuilding: (buildingId: string) => void;
};

export function IslandScene({
  placementMode,
  placedBuildings,
  previewBuilding,
  editingBuildingId,
  onPreviewCell,
  onEditBuilding,
}: IslandSceneProps) {
  const target = useRef<CameraTarget>({
    azimuth: Math.PI,
    elevation: CAMERA.elevation,
    zoom: CAMERA.initialZoom,
    focusX: 0,
    focusZ: 0,
  });
  const motion = useRef<CameraMotion>({
    active: false,
    azimuth: 0,
    elevation: 0,
    focusX: 0,
    focusZ: 0,
  });
  const wake = useRef<() => void>(() => {});
  const previous = useRef<TouchSnapshot | null>(null);
  const usedMultipleTouches = useRef(false);
  const sceneSize = useRef({ width: 0, height: 0 });
  const placementModeRef = useRef(placementMode);
  const placedBuildingsRef = useRef(placedBuildings);
  const onPreviewCellRef = useRef(onPreviewCell);
  const onEditBuildingRef = useRef(onEditBuilding);
  placementModeRef.current = placementMode;
  placedBuildingsRef.current = placedBuildings;
  onPreviewCellRef.current = onPreviewCell;
  onEditBuildingRef.current = onEditBuilding;
  const camera = useMemo(() => {
    const value = new PerspectiveCamera(CAMERA.fov, 1, 0.1, 1500);
    value.position.set(0, 12, 18);
    value.lookAt(0, 0.5, 0);
    return value;
  }, []);
  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (event) => {
      const first = snapshot(event);
      previous.current = first;
      usedMultipleTouches.current = (first?.count ?? 0) > 1;
      motion.current.active = false;
      motion.current.azimuth = 0;
      motion.current.elevation = 0;
      motion.current.focusX = 0;
      motion.current.focusZ = 0;
    },
    onPanResponderMove: (event) => {
      const next = snapshot(event);
      const last = previous.current;
      previous.current = next;
      if ((next?.count ?? 0) > 1) usedMultipleTouches.current = true;
      // Rebase when a finger is added/removed to prevent a camera jump.
      if (!next || !last || next.count !== last.count) return;
      const elapsed = MathUtils.clamp((next.timestamp - last.timestamp) / 1000, 1 / 120, 1 / 20);
      if (next.count === 2 && last.distance > 4 && next.distance > 4) {
        const deltaX = next.x - last.x;
        const deltaY = next.y - last.y;
        const pinchDelta = next.distance - last.distance;
        // Small independent dead zones prevent finger jitter from turning a
        // deliberate pinch into a pan (or the reverse), while still allowing
        // both gestures to be performed together intentionally.
        if (Math.abs(pinchDelta) >= 0.6) {
          target.current.zoom = MathUtils.clamp(
            target.current.zoom * Math.pow(last.distance / next.distance, 1.15),
            CAMERA.minZoom, CAMERA.maxZoom,
          );
        }
        if (Math.hypot(deltaX, deltaY) >= 0.75) {
          const previousFocusX = target.current.focusX;
          const previousFocusZ = target.current.focusZ;
          const nextFocus = panCameraFocus(target.current, deltaX, deltaY);
          target.current.focusX = nextFocus.focusX;
          target.current.focusZ = nextFocus.focusZ;
          motion.current.focusX = MathUtils.clamp(
            MathUtils.lerp(
              motion.current.focusX,
              (nextFocus.focusX - previousFocusX) / elapsed,
              0.4,
            ),
            -3,
            3,
          );
          motion.current.focusZ = MathUtils.clamp(
            MathUtils.lerp(
              motion.current.focusZ,
              (nextFocus.focusZ - previousFocusZ) / elapsed,
              0.4,
            ),
            -3,
            3,
          );
        } else {
          motion.current.focusX *= 0.5;
          motion.current.focusZ *= 0.5;
        }
        motion.current.azimuth = 0;
        motion.current.elevation = 0;
      } else if (next.count === 1) {
        // Keep azimuth unbounded so repeated drags orbit continuously through 360°.
        const azimuthDelta = -(next.x - last.x) * CAMERA.orbitSensitivityX;
        const elevationDelta = (next.y - last.y) * CAMERA.orbitSensitivityY;
        target.current.azimuth += azimuthDelta;
        const nextElevation = MathUtils.clamp(
          target.current.elevation + elevationDelta,
          CAMERA.minElevation, CAMERA.maxElevation,
        );
        target.current.elevation = nextElevation;
        motion.current.azimuth = MathUtils.clamp(
          MathUtils.lerp(motion.current.azimuth, azimuthDelta / elapsed, 0.4),
          -4,
          4,
        );
        motion.current.elevation = nextElevation === CAMERA.minElevation
          || nextElevation === CAMERA.maxElevation
          ? 0
          : MathUtils.clamp(
            MathUtils.lerp(motion.current.elevation, elevationDelta / elapsed, 0.4),
            -2.5,
            2.5,
          );
        motion.current.focusX = 0;
        motion.current.focusZ = 0;
      }
      wake.current();
    },
    onPanResponderRelease: (event, gestureState) => {
      const isTap = !usedMultipleTouches.current && Math.hypot(gestureState.dx, gestureState.dy) < 8;
      motion.current.active = !isTap;
      if (isTap) {
        motion.current.azimuth = 0;
        motion.current.elevation = 0;
        motion.current.focusX = 0;
        motion.current.focusZ = 0;
        const { width, height } = sceneSize.current;
        const touchX = event.nativeEvent.locationX;
        const touchY = event.nativeEvent.locationY;
        camera.updateMatrixWorld();
        if (placementModeRef.current) {
          let nearest: { cell: GridCell; distance: number } | null = null;
          for (const cell of PLAYABLE_GRID_CELLS) {
            const projected = new Vector3(...gridCellToWorld(cell)).project(camera);
            if (projected.z < -1 || projected.z > 1) continue;
            const x = (projected.x + 1) * 0.5 * width;
            const y = (1 - projected.y) * 0.5 * height;
            const distance = Math.hypot(touchX - x, touchY - y);
            if (distance <= 38 && (!nearest || distance < nearest.distance)) {
              nearest = { cell, distance };
            }
          }
          if (nearest) onPreviewCellRef.current(nearest.cell);
        } else {
          let nearest: { id: string; distance: number } | null = null;
          for (const building of placedBuildingsRef.current) {
            const position = placementWorldPosition(building);
            const objectHeight = OBJECT_DEFINITIONS[building.type].visual.selectionHeight;
            const projected = new Vector3(
              position[0],
              position[1] + objectHeight,
              position[2],
            ).project(camera);
            const x = (projected.x + 1) * 0.5 * width;
            const y = (1 - projected.y) * 0.5 * height;
            const distance = Math.hypot(touchX - x, touchY - y);
            if (distance <= 44 && (!nearest || distance < nearest.distance)) {
              nearest = { id: building.id, distance };
            }
          }
          if (nearest) onEditBuildingRef.current(nearest.id);
        }
      }
      previous.current = null;
      usedMultipleTouches.current = false;
      if (motion.current.active) wake.current();
    },
    onPanResponderTerminate: () => {
      previous.current = null;
      usedMultipleTouches.current = false;
      motion.current.active = false;
      motion.current.azimuth = 0;
      motion.current.elevation = 0;
      motion.current.focusX = 0;
      motion.current.focusZ = 0;
    },
    onPanResponderTerminationRequest: () => true,
  }), []);

  return (
    <View
      style={StyleSheet.absoluteFill}
      onLayout={(event) => { sceneSize.current = event.nativeEvent.layout; }}
      {...responder.panHandlers}
    >
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Canvas camera={camera} frameloop="demand" shadows={false}>
          <color attach="background" args={['#B9D8F1']} />
          <Suspense fallback={null}>
            <PanoramaBackground />
          </Suspense>
          <hemisphereLight args={['#F1F6FF', '#8999B1', 2.0]} />
          <directionalLight position={[7, 8, -4]} color="#FFF1D6" intensity={2.2} />
          <Suspense fallback={null}>
            <Island />
          </Suspense>
          <Suspense fallback={null}>
            <PlacementLayer
              active={placementMode}
              placedBuildings={placedBuildings}
              previewBuilding={previewBuilding}
              editingBuildingId={editingBuildingId}
            />
          </Suspense>
          <CameraRig target={target} motion={motion} wake={wake} />
        </Canvas>
      </View>
    </View>
  );
}
