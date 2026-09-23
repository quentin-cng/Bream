// Bundled backgrounds use stable IDs so a future selection screen can store an
// ID without coupling the renderer to asset filenames.
export const BACKGROUNDS = {
  default_sky: {
    id: 'default_sky',
    name: 'Default Sky',
    source: require('../../assets/isometric/backgrounds/sky-background.png'),
  },
} as const;

export type BackgroundId = keyof typeof BACKGROUNDS;
export const DEFAULT_BACKGROUND_ID: BackgroundId = 'default_sky';

export function getBackground(id: BackgroundId) {
  return BACKGROUNDS[id];
}
