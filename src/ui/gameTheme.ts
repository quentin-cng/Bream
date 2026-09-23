// Shared visual tokens for Bream's illustrated, cozy mobile-game UI.
// Gameplay/world colors intentionally remain outside this presentation layer.
export const GAME_COLORS = {
  canvas: '#F5F0E7',
  cream: '#FFF9EF',
  card: '#FFFCF7',
  cardSoft: '#F4EDE3',
  white: '#FFFFFF',
  ink: '#29263F',
  text: '#45404B',
  muted: '#7B747B',
  border: '#E4D8CA',
  borderStrong: '#D5C6B5',
  primary: '#3BA9EC',
  primaryDark: '#176CA9',
  primarySoft: '#DCF4FF',
  green: '#78C94A',
  greenDark: '#4A982D',
  red: '#F15B5D',
  redDark: '#C93D42',
  gold: '#F6B62F',
  goldSoft: '#FFF0C5',
  orange: '#FF983B',
  purple: '#8B72D3',
  purpleSoft: '#EEE8FF',
  shadow: '#594D40',
} as const;

export const GAME_RADII = {
  small: 10,
  control: 14,
  card: 18,
  panel: 24,
} as const;

export const GAME_SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
} as const;

export const GAME_SHADOWS = {
  soft: {
    shadowColor: GAME_COLORS.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.16,
    shadowRadius: 7,
    elevation: 4,
  },
  raised: {
    shadowColor: GAME_COLORS.shadow,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 7,
  },
} as const;
