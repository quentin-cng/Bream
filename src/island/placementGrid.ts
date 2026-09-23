const GRID_COLUMNS = 52;
const GRID_ROWS = 52;

// The 52 × 52 grid is centered on the enlarged island art. A 28-cell radius
// leaves a visual margin at the four grassy corners while fully containing the
// former 44 × 44 playable mask, so valid legacy placements remain valid.
const PLAYABLE_RADIUS_X = 28;
const PLAYABLE_RADIUS_Y = 28;

export const GRID_CONFIG = {
  columns: GRID_COLUMNS,
  rows: GRID_ROWS,
} as const;

export type GridCell = {
  gridX: number;
  gridY: number;
};

export type Footprint = ObjectFootprint;
export type { PlaceableType } from './objectCatalog';

export type BuildingDraft = GridCell & {
  type: PlaceableType;
  rotationQuarterTurns: number;
};

export type BuildingPlacement = BuildingDraft & {
  id: string;
};

export type PlacementValidity = {
  valid: boolean;
  cells: GridCell[];
  outsideGrid: boolean;
  colliding: boolean;
};

export function cellKey(cell: GridCell): string {
  return `${cell.gridX}:${cell.gridY}`;
}

export function createPlacementId(type: PlaceableType, placements: BuildingPlacement[]): string {
  const existingIds = new Set(placements.map((placement) => placement.id));
  let suffix = placements.length + 1;
  while (existingIds.has(`${type}-${suffix}`)) suffix += 1;
  return `${type}-${suffix}`;
}

// The source island has a rounded top. The logical grid remains rectangular,
// while this generated ellipse removes only corner cells that sit too close
// to the visible cliff edge.
export function isPlayableCell(cell: GridCell): boolean {
  if (
    cell.gridX < 0
    || cell.gridX >= GRID_CONFIG.columns
    || cell.gridY < 0
    || cell.gridY >= GRID_CONFIG.rows
  ) return false;

  const centerX = (GRID_CONFIG.columns - 1) / 2;
  const centerY = (GRID_CONFIG.rows - 1) / 2;
  const normalizedX = (cell.gridX - centerX) / PLAYABLE_RADIUS_X;
  const normalizedY = (cell.gridY - centerY) / PLAYABLE_RADIUS_Y;
  return normalizedX * normalizedX + normalizedY * normalizedY <= 1;
}

export const PLAYABLE_GRID_CELLS: GridCell[] = Array.from(
  { length: GRID_CONFIG.rows },
  (_, gridY) => Array.from(
    { length: GRID_CONFIG.columns },
    (__, gridX) => ({ gridX, gridY }),
  ),
).flat().filter(isPlayableCell);

const PLACEMENT_SEARCH_CELLS = [...PLAYABLE_GRID_CELLS].sort((a, b) => {
  const centerX = (GRID_CONFIG.columns - 1) / 2;
  const centerY = (GRID_CONFIG.rows - 1) / 2;
  const distanceA = (a.gridX - centerX) ** 2 + (a.gridY - centerY) ** 2;
  const distanceB = (b.gridX - centerX) ** 2 + (b.gridY - centerY) ** 2;
  return distanceA - distanceB;
});

export function getRotatedFootprint(
  type: PlaceableType,
  rotationQuarterTurns: number,
): Footprint {
  return rotateFootprint(getObjectFootprint(type), rotationQuarterTurns);
}

export function rotateFootprint(
  footprint: Footprint,
  rotationQuarterTurns: number,
): Footprint {
  return Math.abs(rotationQuarterTurns) % 2 === 1
    ? { width: footprint.height, height: footprint.width }
    : { ...footprint };
}

export function getPlacementCells(placement: BuildingDraft): GridCell[] {
  const footprint = getRotatedFootprint(placement.type, placement.rotationQuarterTurns);
  const cells: GridCell[] = [];
  for (let offsetY = 0; offsetY < footprint.height; offsetY += 1) {
    for (let offsetX = 0; offsetX < footprint.width; offsetX += 1) {
      cells.push({
        gridX: placement.gridX + offsetX,
        gridY: placement.gridY + offsetY,
      });
    }
  }
  return cells;
}

export function getOccupiedCellKeys(
  placements: BuildingPlacement[],
  ignoredPlacementId: string | null = null,
): Set<string> {
  const occupied = new Set<string>();
  for (const placement of placements) {
    if (placement.id === ignoredPlacementId) continue;
    for (const cell of getPlacementCells(placement)) occupied.add(cellKey(cell));
  }
  return occupied;
}

export function validatePlacement(
  placement: BuildingDraft,
  placements: BuildingPlacement[],
  ignoredPlacementId: string | null = null,
): PlacementValidity {
  const occupied = getOccupiedCellKeys(placements, ignoredPlacementId);
  return validatePlacementAgainstOccupied(placement, occupied);
}

function validatePlacementAgainstOccupied(
  placement: BuildingDraft,
  occupied: Set<string>,
): PlacementValidity {
  const cells = getPlacementCells(placement);
  const outsideGrid = cells.some((cell) => !isPlayableCell(cell));
  const colliding = cells.some((cell) => occupied.has(cellKey(cell)));
  return {
    valid: !outsideGrid && !colliding,
    cells,
    outsideGrid,
    colliding,
  };
}

export function movePlacementToCell(
  placement: BuildingDraft,
  target: GridCell,
): BuildingDraft {
  const footprint = getRotatedFootprint(placement.type, placement.rotationQuarterTurns);
  return {
    ...placement,
    gridX: target.gridX - Math.floor(footprint.width / 2),
    gridY: target.gridY - Math.floor(footprint.height / 2),
  };
}

export function findFirstValidPlacement(
  type: PlaceableType,
  placements: BuildingPlacement[],
): BuildingDraft | null {
  const occupied = getOccupiedCellKeys(placements);
  for (const target of PLACEMENT_SEARCH_CELLS) {
    const candidate = movePlacementToCell({
      type,
      gridX: target.gridX,
      gridY: target.gridY,
      rotationQuarterTurns: 0,
    }, target);
    if (validatePlacementAgainstOccupied(candidate, occupied).valid) return candidate;
  }
  return null;
}
import {
  getObjectFootprint,
  type ObjectFootprint,
  type PlaceableType,
} from './objectCatalog';
