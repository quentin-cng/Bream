import { Platform } from 'react-native';

import { healthConnectSource } from './healthConnect.android';
import type { StepSnapshot, StepSource, StepSourceStatus } from './stepSource';

const mockSource: StepSource = {
  async getStatus() { return 'mock'; },
  async connect() { return 'mock'; },
  async getTodayStepSnapshot() { return null; },
};

const source = Platform.OS === 'android' ? healthConnectSource : mockSource;

export async function getHealthStatus(): Promise<StepSourceStatus> {
  try {
    return await source.getStatus();
  } catch (error) {
    console.warn('Could not check health availability', error);
    return 'error';
  }
}

export async function connectHealth(): Promise<StepSourceStatus> {
  try {
    return await source.connect();
  } catch (error) {
    console.warn('Could not connect Health Connect', error);
    return 'error';
  }
}

export async function readTodaySteps(): Promise<StepSnapshot | null> {
  return source.getTodayStepSnapshot();
}
