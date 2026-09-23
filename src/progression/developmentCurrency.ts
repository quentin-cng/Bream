import type { PlayerState } from './playerProgression';

// Only the development reducer calls this. It leaves health bookkeeping,
// Steps, XP and level intact and keeps the save's Energy count valid.
export function addDevelopmentEnergy(state: PlayerState, amount: number): PlayerState {
  if (!Number.isSafeInteger(amount) || amount <= 0) return state;
  const energy = state.energy + amount;
  return Number.isSafeInteger(energy) ? { ...state, energy } : state;
}
