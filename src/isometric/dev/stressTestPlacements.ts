import type { BuildableType } from '../../island/objectCatalog';
import {
  PLAYABLE_GRID_CELLS,
  cellKey,
  getOccupiedCellKeys,
  getPlacementCells,
  isPlayableCell,
  type BuildingPlacement,
} from '../../island/placementGrid';

export const STRESS_TEST_COUNTS = [0, 25, 50, 100, 150] as const;
export type StressTestCount = typeof STRESS_TEST_COUNTS[number];

const STRESS_TYPES: readonly BuildableType[] = ['house2', 'house3', 'house1'];

// Stable pseudo-random ordering distributes objects across the island instead
// of filling it row-by-row, while keeping device-to-device comparisons repeatable.
const DISTRIBUTED_CELLS = [...PLAYABLE_GRID_CELLS].sort((a, b) => {
  const score = (cell: typeof a) => ((cell.gridX * 73856093) ^ (cell.gridY * 19349663)) >>> 0;
  return score(a) - score(b) || a.gridY - b.gridY || a.gridX - b.gridX;
});

export function generateStressTestPlacements(
  requestedCount: number,
  reservedPlacements: readonly BuildingPlacement[] = [],
): BuildingPlacement[] {
  const target = Math.max(0, Math.min(150, Math.floor(requestedCount)));
  if (target === 0) return [];

  const occupied = getOccupiedCellKeys([...reservedPlacements]);
  const generated: BuildingPlacement[] = [];

  for (const cell of DISTRIBUTED_CELLS) {
    if (generated.length >= target) break;
    const type = STRESS_TYPES[generated.length % STRESS_TYPES.length];
    const candidate: BuildingPlacement = {
      id: `__dev-stress-${generated.length + 1}`,
      type,
      gridX: cell.gridX,
      gridY: cell.gridY,
      rotationQuarterTurns: generated.length % 4,
    };
    const cells = getPlacementCells(candidate);
    if (cells.some((occupiedCell) => !isPlayableCell(occupiedCell) || occupied.has(cellKey(occupiedCell)))) {
      continue;
    }
    cells.forEach((occupiedCell) => occupied.add(cellKey(occupiedCell)));
    generated.push(candidate);
  }

  return generated;
}

