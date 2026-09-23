import { getObjectDefinition, isBuildableType, isPlaceableType } from './objectCatalog';
import {
  createPlacementId,
  validatePlacement,
  type BuildingDraft,
  type BuildingPlacement,
} from './placementGrid';

// Keep a confirmed record identical to the preview's grid draft. The same
// coordinates are then used by both the preview and the placed sprite.
export function commitPreviewPlacement(
  preview: BuildingDraft,
  placements: BuildingPlacement[],
  editingId: string | null,
): { placements: BuildingPlacement[]; placed: BuildingPlacement; isNew: boolean } | null {
  const existing = editingId ? placements.find((building) => building.id === editingId) : null;
  if (editingId && (!existing || existing.type !== preview.type)) return null;
  if (!editingId && !isBuildableType(preview.type)) return null;
  if (!validatePlacement(preview, placements, editingId).valid) return null;

  const placed: BuildingPlacement = {
    id: existing?.id ?? createPlacementId(preview.type, placements),
    type: preview.type,
    gridX: preview.gridX,
    gridY: preview.gridY,
    rotationQuarterTurns: preview.rotationQuarterTurns,
  };
  return {
    placements: existing
      ? placements.map((building) => building.id === existing.id ? placed : building)
      : [...placements, placed],
    placed,
    isNew: !existing,
  };
}

export function getSellRefund(type: string): number {
  // An unknown future/legacy type can be removed safely without inventing a cost.
  return isPlaceableType(type) ? Math.floor(getObjectDefinition(type).cost * 0.5) : 0;
}

export function sellPlacedBuilding(placements: BuildingPlacement[], id: string): {
  placements: BuildingPlacement[];
  refund: number;
  deleted: boolean;
} {
  const building = placements.find((candidate) => candidate.id === id);
  if (!building) return { placements, refund: 0, deleted: false };
  return {
    placements: placements.filter((candidate) => candidate.id !== id),
    refund: getSellRefund(building.type),
    deleted: true,
  };
}
