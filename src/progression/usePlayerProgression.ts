import { useReducer } from 'react';

import { getLocalDate, type StepSnapshot } from '../health/stepSource';
import { addDevelopmentEnergy } from './developmentCurrency';
import {
  awardConstruction,
  createInitialPlayerState,
  getPlayerLevel,
  INITIAL_PLAYER_STATE,
  rollOverDailySteps,
  refundBuildingSale,
  syncStepSnapshot,
  type PlayerState,
} from './playerProgression';

type PlayerAction =
  | { type: 'syncSnapshot'; snapshot: StepSnapshot; localDate: string }
  | { type: 'rollover'; localDate: string }
  | { type: 'build'; cost: number; xpReward: number }
  | { type: 'sell'; refund: number }
  | { type: 'debugSteps'; amount: number; localDate: string }
  | { type: 'debugEnergy'; amount: number }
  | { type: 'debugXp'; amount: number }
  | { type: 'reset'; localDate: string };

function playerReducer(state: PlayerState, action: PlayerAction): PlayerState {
  switch (action.type) {
    case 'syncSnapshot':
      return syncStepSnapshot(state, action.snapshot, action.localDate);
    case 'rollover':
      return rollOverDailySteps(state, action.localDate);
    case 'build':
      return awardConstruction(state, action.cost, action.xpReward);
    case 'sell':
      return refundBuildingSale(state, action.refund);
    case 'debugSteps': {
      const current = rollOverDailySteps(state, action.localDate);
      if (current.dailySteps.source !== 'mock') return current;
      return syncStepSnapshot(current, { source: 'mock', localDate: action.localDate, steps: current.steps + action.amount }, action.localDate);
    }
    case 'debugEnergy': {
      return __DEV__ ? addDevelopmentEnergy(state, action.amount) : state;
    }
    case 'debugXp': {
      const xp = state.xp + action.amount;
      return { ...state, xp, level: getPlayerLevel(xp) };
    }
    case 'reset':
      return createInitialPlayerState(action.localDate);
  }
}

export function usePlayerProgression(initialPlayer = INITIAL_PLAYER_STATE) {
  const [player, dispatch] = useReducer(playerReducer, initialPlayer);
  return {
    player,
    syncSnapshot: (snapshot: StepSnapshot) => dispatch({ type: 'syncSnapshot', snapshot, localDate: getLocalDate() }),
    rollOverToday: () => dispatch({ type: 'rollover', localDate: getLocalDate() }),
    awardBuilding: (cost: number, xpReward: number) => dispatch({ type: 'build', cost, xpReward }),
    refundBuilding: (refund: number) => dispatch({ type: 'sell', refund }),
    addMockSteps: (amount: number) => dispatch({ type: 'debugSteps', amount, localDate: getLocalDate() }),
    addMockEnergy: (amount: number) => dispatch({ type: 'debugEnergy', amount }),
    addMockXp: (amount: number) => dispatch({ type: 'debugXp', amount }),
    resetPlayer: () => dispatch({ type: 'reset', localDate: getLocalDate() }),
  };
}
