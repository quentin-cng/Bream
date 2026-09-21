export type ObjectCategory = 'nature' | 'buildings' | 'decorations' | 'special';

export type ObjectFootprint = {
  width: number;
  height: number;
};

export type ObjectVisualConfig = {
  scale: number;
  rotationOffset: readonly [number, number, number];
  positionOffset: readonly [number, number, number];
  selectionHeight: number;
};

export type BuildableObjectDefinition = {
  name: string;
  category: ObjectCategory;
  asset: number;
  thumbnail: number;
  footprint: ObjectFootprint;
  unlockLevel: number;
  cost: number;
  glyph: string;
  visual: ObjectVisualConfig;
};

// Metro requires static asset references. Geometry normalization remains data
// driven here so rendering and placement never need per-model special cases.
export const OBJECT_DEFINITIONS = {
  balconyHouse: {
    name: 'Maison à balcon',
    category: 'buildings',
    asset: require('../../assets/houses/house__building_low_poly.glb'),
    thumbnail: require('../../assets/houses/houses_images/house__building_low_poly_image.png'),
    footprint: { width: 3, height: 3 },
    unlockLevel: 1,
    cost: 420,
    glyph: '⌂',
    visual: {
      scale: 0.0186,
      rotationOffset: [0, 0, 0],
      positionOffset: [-0.1228, 0.4971, -0.3278],
      selectionHeight: 0.24,
    },
  },
  townBuilding: {
    name: 'Maison de ville',
    category: 'buildings',
    asset: require('../../assets/houses/low_poly_building.glb'),
    thumbnail: require('../../assets/houses/houses_images/low_poly_building_image.png'),
    footprint: { width: 3, height: 3 },
    unlockLevel: 1,
    cost: 520,
    glyph: '▥',
    visual: {
      scale: 0.00155,
      rotationOffset: [0, 0, 0],
      positionOffset: [1.8446, 0, -16.9195],
      selectionHeight: 0.29,
    },
  },
  civicHouse: {
    name: 'Maison longue',
    category: 'buildings',
    asset: require('../../assets/houses/low_poly_house_1.glb'),
    thumbnail: require('../../assets/houses/houses_images/low_poly_house_1_image.png'),
    footprint: { width: 2, height: 3 },
    unlockLevel: 1,
    cost: 360,
    glyph: '⌂',
    visual: {
      scale: 0.0475,
      rotationOffset: [0, 0, 0],
      positionOffset: [-0.1877, 0, 0.2161],
      selectionHeight: 0.15,
    },
  },
  gardenHouse: {
    name: 'Petite maison',
    category: 'buildings',
    asset: require('../../assets/houses/low_poly_house_5.glb'),
    thumbnail: require('../../assets/houses/houses_images/low_poly_house_5.png'),
    footprint: { width: 2, height: 2 },
    unlockLevel: 1,
    cost: 300,
    glyph: '⌂',
    visual: {
      scale: 0.0422,
      rotationOffset: [0, 0, 0],
      positionOffset: [-0.4192, 0, 0],
      selectionHeight: 0.15,
    },
  },
  cozyCottage: {
    name: 'Cottage doux',
    category: 'buildings',
    asset: require('../../assets/houses/stylizes_low-poly_house.glb'),
    thumbnail: require('../../assets/houses/houses_images/stylizes_low-poly_house_image.png'),
    footprint: { width: 3, height: 3 },
    unlockLevel: 1,
    cost: 460,
    glyph: '⌁',
    visual: {
      scale: 0.021,
      rotationOffset: [0, 0, 0],
      positionOffset: [-1.6649, 0, 0.4296],
      selectionHeight: 0.16,
    },
  },
} as const satisfies Record<string, BuildableObjectDefinition>;

export type PlaceableType = keyof typeof OBJECT_DEFINITIONS;

export const BUILD_CATEGORIES: ReadonlyArray<{
  id: ObjectCategory;
  label: string;
}> = [
  { id: 'buildings', label: 'Bâtiments' },
];

export function getObjectsByCategory(category: ObjectCategory) {
  return (Object.entries(OBJECT_DEFINITIONS) as Array<[
    PlaceableType,
    BuildableObjectDefinition,
  ]>).filter(([, definition]) => definition.category === category);
}
