export type ObjectCategory = 'nature' | 'buildings' | 'decorations' | 'special';

export type ObjectFootprint = {
  width: number;
  height: number;
};

export type BuildableObjectDefinition = {
  name: string;
  category: ObjectCategory;
  thumbnail: number;
  footprint: ObjectFootprint;
  unlockLevel: number;
  cost: number;
  xpReward: number;
};

// Gameplay metadata only. The matching world-sprite dimensions and anchors
// live in the separate isometric sprite catalog.
export const OBJECT_DEFINITIONS = {
  house1: {
    name: 'Maison niveau 1', category: 'buildings',
    thumbnail: require('../../assets/houses/house-level-1.png'),
    footprint: { width: 3, height: 3 }, unlockLevel: 1, cost: 420, xpReward: 45,
  },
  house2: {
    name: 'Maison de ville', category: 'buildings',
    thumbnail: require('../../assets/houses/house-level-1.png'),
    footprint: { width: 2, height: 2 }, unlockLevel: 1, cost: 360, xpReward: 35,
  },
  house3: {
    name: 'Cottage rustique', category: 'buildings',
    thumbnail: require('../../assets/houses/house-level-1.png'),
    footprint: { width: 2, height: 2 }, unlockLevel: 1, cost: 300, xpReward: 30,
  },
} as const satisfies Record<string, BuildableObjectDefinition>;

export type BuildableType = keyof typeof OBJECT_DEFINITIONS;

// Keep old types valid for save compatibility, but only propose the new base
// house until matching art is available for the remaining definitions.
const ACTIVE_BUILDABLE_TYPES: ReadonlySet<BuildableType> = new Set(['house1']);

// Old save records keep their original type and footprint. They can be edited
// but are not offered for new construction. displayAs is only a 2D art fallback.
export const LEGACY_OBJECT_DEFINITIONS = {
  balconyHouse: { name: 'Maison à balcon', footprint: { width: 3, height: 3 }, displayAs: 'house1', originalCost: 420 },
  townBuilding: { name: 'Ancienne maison de ville', footprint: { width: 3, height: 3 }, displayAs: 'house1', originalCost: 520 },
  civicHouse: { name: 'Maison longue', footprint: { width: 2, height: 3 }, displayAs: 'house3', originalCost: 360 },
  gardenHouse: { name: 'Petite maison', footprint: { width: 2, height: 2 }, displayAs: 'house3', originalCost: 300 },
  cozyCottage: { name: 'Cottage doux', footprint: { width: 3, height: 3 }, displayAs: 'house1', originalCost: 460 },
} as const satisfies Record<string, { name: string; footprint: ObjectFootprint; displayAs: BuildableType; originalCost: number }>;

export type LegacyPlaceableType = keyof typeof LEGACY_OBJECT_DEFINITIONS;
export type PlaceableType = BuildableType | LegacyPlaceableType;

export function isBuildableType(value: unknown): value is BuildableType {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(OBJECT_DEFINITIONS, value);
}

export function isPlaceableType(value: unknown): value is PlaceableType {
  return isBuildableType(value)
    || (typeof value === 'string' && Object.prototype.hasOwnProperty.call(LEGACY_OBJECT_DEFINITIONS, value));
}

export function getObjectFootprint(type: PlaceableType): ObjectFootprint {
  return isBuildableType(type) ? OBJECT_DEFINITIONS[type].footprint : LEGACY_OBJECT_DEFINITIONS[type].footprint;
}

export function getObjectDefinition(type: PlaceableType): BuildableObjectDefinition {
  if (isBuildableType(type)) return OBJECT_DEFINITIONS[type];
  const legacy = LEGACY_OBJECT_DEFINITIONS[type];
  return {
    ...OBJECT_DEFINITIONS[legacy.displayAs],
    name: legacy.name,
    footprint: legacy.footprint,
    cost: legacy.originalCost,
    xpReward: 0,
  };
}

export const BUILD_CATEGORIES: ReadonlyArray<{ id: ObjectCategory; label: string }> = [
  { id: 'buildings', label: 'Bâtiments' },
];

export function getObjectsByCategory(category: ObjectCategory): Array<[BuildableType, BuildableObjectDefinition]> {
  return (Object.entries(OBJECT_DEFINITIONS) as Array<[BuildableType, BuildableObjectDefinition]>)
    .filter(([type, definition]) => definition.category === category && ACTIVE_BUILDABLE_TYPES.has(type));
}
