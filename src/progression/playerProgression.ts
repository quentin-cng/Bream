import { getLocalDate, type StepSnapshot } from '../health/stepSource';

export type DailyStepCredit = {
  date: string;
  reportedStepsToday: number;
  creditedStepsToday: number;
  source: StepSnapshot['source'];
};

export type PlayerState = {
  steps: number;
  energy: number;
  xp: number;
  level: number;
  carriedSteps: number;
  dailySteps: DailyStepCredit;
};

export const STEPS_PER_ENERGY = 10;
export const LEVEL_THRESHOLDS = [0, 100, 250, 500, 900, 1400, 2100, 3000, 4200, 5700] as const;

// This policy is isolated so onboarding can change without changing health adapters or save I/O.
export const STEP_CREDIT_CONFIG: { firstHealthSync: 'baseline-without-reward' | 'award-current-total' } = {
  firstHealthSync: 'baseline-without-reward',
};

export function stepsToEnergy(steps: number): number {
  return Math.floor(Math.max(0, steps) / STEPS_PER_ENERGY);
}

export function getPlayerLevel(xp: number): number {
  let level = 1;
  for (let index = 1; index < LEVEL_THRESHOLDS.length; index += 1) {
    if (xp < LEVEL_THRESHOLDS[index]) break;
    level = index + 1;
  }
  return level;
}

export function getXpForNextLevel(xp: number): number | null {
  return LEVEL_THRESHOLDS[getPlayerLevel(xp)] ?? null;
}

export function canUnlock(unlockLevel: number, playerLevel: number): boolean {
  return playerLevel >= unlockLevel;
}

export function canAfford(cost: number, energy: number): boolean {
  return energy >= cost;
}

export function createInitialPlayerState(date = getLocalDate()): PlayerState {
  const mockSteps = 3240;
  return {
    steps: mockSteps,
    energy: stepsToEnergy(mockSteps),
    xp: 0,
    level: 1,
    carriedSteps: 0,
    dailySteps: { date, reportedStepsToday: mockSteps, creditedStepsToday: mockSteps, source: 'mock' },
  };
}

export const INITIAL_PLAYER_STATE = createInitialPlayerState();

export function rollOverDailySteps(state: PlayerState, localDate: string): PlayerState {
  // A late read must never reopen an older credited day.
  if (localDate <= state.dailySteps.date) return state;
  return {
    ...state,
    steps: 0,
    carriedSteps: state.carriedSteps + Math.max(0, state.dailySteps.reportedStepsToday - state.dailySteps.creditedStepsToday),
    dailySteps: { date: localDate, reportedStepsToday: 0, creditedStepsToday: 0, source: state.dailySteps.source },
  };
}

export function syncStepSnapshot(state: PlayerState, snapshot: StepSnapshot, localDate = getLocalDate()): PlayerState {
  if (snapshot.localDate !== localDate || !Number.isSafeInteger(snapshot.steps) || snapshot.steps < 0) return state;
  const current = rollOverDailySteps(state, localDate);
  if (current.dailySteps.date !== localDate) return current;
  const previous = current.dailySteps;
  if (snapshot.source === 'health-connect' && previous.source !== 'health-connect') {
    const useBaseline = STEP_CREDIT_CONFIG.firstHealthSync === 'baseline-without-reward';
    return {
      ...current,
      energy: current.energy + (useBaseline ? 0 : stepsToEnergy(snapshot.steps)),
      steps: snapshot.steps,
      carriedSteps: 0,
      dailySteps: {
        date: localDate,
        reportedStepsToday: snapshot.steps,
        creditedStepsToday: useBaseline ? snapshot.steps : stepsToEnergy(snapshot.steps) * STEPS_PER_ENERGY,
        source: snapshot.source,
      },
    };
  }
  // Development mock input must never replace an established Health watermark.
  if (snapshot.source !== previous.source) return current;
  const eligibleSteps = Math.max(0, snapshot.steps - previous.creditedStepsToday);
  const earned = stepsToEnergy(current.carriedSteps + eligibleSteps);
  const creditedStepsToday = previous.creditedStepsToday
    + (earned > 0 ? earned * STEPS_PER_ENERGY - current.carriedSteps : 0);
  return {
    ...current,
    steps: snapshot.steps,
    energy: current.energy + earned,
    carriedSteps: earned > 0 ? 0 : current.carriedSteps,
    dailySteps: { date: localDate, reportedStepsToday: snapshot.steps, creditedStepsToday, source: snapshot.source },
  };
}

export function awardConstruction(state: PlayerState, cost: number, xpReward: number): PlayerState {
  if (!canAfford(cost, state.energy)) return state;
  const xp = state.xp + xpReward;
  return { ...state, energy: state.energy - cost, xp, level: getPlayerLevel(xp) };
}

export function refundBuildingSale(state: PlayerState, refund: number): PlayerState {
  if (!Number.isSafeInteger(refund) || refund <= 0) return state;
  return { ...state, energy: Math.min(Number.MAX_SAFE_INTEGER, state.energy + refund) };
}
