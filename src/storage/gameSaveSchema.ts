import { isPlaceableType } from '../island/objectCatalog';
import {
  GRID_CONFIG,
  getPlacementCells,
  isPlayableCell,
  cellKey,
  type BuildingPlacement,
} from '../island/placementGrid';
import { getPlayerLevel, type DailyStepCredit, type PlayerState } from '../progression/playerProgression';

export const GAME_SAVE_VERSION = 2;

export type GameSnapshot = {
  player: PlayerState;
  placedObjects: BuildingPlacement[];
};

export type GameSaveV1 = {
  version: 1;
  player: Pick<PlayerState, 'steps' | 'energy' | 'xp'>;
  placedObjects: BuildingPlacement[];
};

export type GameSaveV2 = {
  version: 2;
  player: Pick<PlayerState, 'energy' | 'xp' | 'carriedSteps'>;
  dailySteps: DailyStepCredit;
  placedObjects: BuildingPlacement[];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isCount = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;

function readPlacements(rawPlacements: unknown): BuildingPlacement[] | null {
  if (!Array.isArray(rawPlacements) || rawPlacements.length > GRID_CONFIG.columns * GRID_CONFIG.rows) return null;
  const placedObjects: BuildingPlacement[] = [];
  const ids = new Set<string>();
  const occupied = new Set<string>();
  for (const raw of rawPlacements) {
    if (!isRecord(raw)) return null;
    const { id, type, gridX, gridY, rotationQuarterTurns } = raw;
    if (
      typeof id !== 'string' || id.length === 0 || id.length > 128 || ids.has(id)
      || !isPlaceableType(type)
      || !Number.isInteger(gridX) || !Number.isInteger(gridY)
      || !Number.isInteger(rotationQuarterTurns)
      || typeof gridX !== 'number' || typeof gridY !== 'number'
      || typeof rotationQuarterTurns !== 'number'
      || rotationQuarterTurns < 0 || rotationQuarterTurns > 3
    ) return null;

    const placement: BuildingPlacement = { id, type, gridX, gridY, rotationQuarterTurns };
    const cells = getPlacementCells(placement);
    if (cells.some((cell) => !isPlayableCell(cell) || occupied.has(cellKey(cell)))) return null;
    cells.forEach((cell) => occupied.add(cellKey(cell)));
    ids.add(id);
    placedObjects.push(placement);
  }

  return placedObjects;
}

const isLocalDate = (value: unknown): value is string => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};

function readV1(value: Record<string, unknown>): GameSnapshot | null {
  if (!isRecord(value.player)) return null;
  const placedObjects = readPlacements(value.placedObjects);
  const { steps, energy, xp } = value.player;
  if (!placedObjects || !isCount(steps) || !isCount(energy) || !isCount(xp)) return null;
  // V1 had no date. Its mock steps cannot safely count as today's steps; keep Energy/XP/objects.
  const dailySteps: DailyStepCredit = { date: '1970-01-01', reportedStepsToday: 0, creditedStepsToday: 0, source: 'mock' };
  return { player: { steps: 0, energy, xp, level: getPlayerLevel(xp), carriedSteps: 0, dailySteps }, placedObjects };
}

function readV2(value: Record<string, unknown>): GameSnapshot | null {
  if (!isRecord(value.player) || !isRecord(value.dailySteps)) return null;
  const placedObjects = readPlacements(value.placedObjects);
  const { energy, xp } = value.player;
  const carriedSteps = value.player.carriedSteps ?? 0;
  const { date, reportedStepsToday, creditedStepsToday, source } = value.dailySteps;
  if (
    !placedObjects || !isCount(energy) || !isCount(xp) || !isCount(carriedSteps)
    || carriedSteps >= 10 || !isLocalDate(date)
    || !isCount(reportedStepsToday) || !isCount(creditedStepsToday)
    || (source !== 'mock' && source !== 'health-connect')
  ) return null;
  const dailySteps: DailyStepCredit = { date, reportedStepsToday, creditedStepsToday, source };
  return {
    player: { steps: reportedStepsToday, energy, xp, level: getPlayerLevel(xp), carriedSteps, dailySteps },
    placedObjects,
  };
}

export function decodeGameSave(value: unknown): GameSnapshot | null {
  if (!isRecord(value)) return null;
  switch (value.version) {
    case 1:
      return readV1(value);
    case GAME_SAVE_VERSION:
      return readV2(value);
    default:
      return null;
  }
}

export function encodeGameSave({ player, placedObjects }: GameSnapshot): GameSaveV2 {
  return {
    version: GAME_SAVE_VERSION,
    player: { energy: player.energy, xp: player.xp, carriedSteps: player.carriedSteps },
    dailySteps: player.dailySteps,
    placedObjects: placedObjects.map(({ id, type, gridX, gridY, rotationQuarterTurns }) => ({
      id, type, gridX, gridY, rotationQuarterTurns,
    })),
  };
}
