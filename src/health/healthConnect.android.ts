import {
  aggregateRecord,
  getGrantedPermissions,
  getSdkStatus,
  initialize,
  requestPermission,
  SdkAvailabilityStatus,
} from 'react-native-health-connect';

import { getLocalDayRange, type StepSnapshot, type StepSource, type StepSourceStatus } from './stepSource';

const STEP_PERMISSION = { accessType: 'read' as const, recordType: 'Steps' as const };

async function isAvailable(): Promise<boolean> {
  return await getSdkStatus() === SdkAvailabilityStatus.SDK_AVAILABLE && await initialize();
}

async function hasStepPermission(): Promise<boolean> {
  return (await getGrantedPermissions()).some(
    (permission) => permission.accessType === 'read' && permission.recordType === 'Steps',
  );
}

export const healthConnectSource: StepSource = {
  async getStatus(): Promise<StepSourceStatus> {
    if (!await isAvailable()) return 'unavailable';
    return await hasStepPermission() ? 'connected' : 'permission-required';
  },

  async connect(): Promise<StepSourceStatus> {
    if (!await isAvailable()) return 'unavailable';
    if (await hasStepPermission()) return 'connected';
    const granted = await requestPermission([STEP_PERMISSION]);
    return granted.some((permission) => permission.accessType === 'read' && permission.recordType === 'Steps')
      ? 'connected'
      : 'denied';
  },

  async getTodayStepSnapshot(): Promise<StepSnapshot | null> {
    if (!await isAvailable() || !await hasStepPermission()) return null;
    const { localDate, startTime, endTime } = getLocalDayRange();
    const aggregate = await aggregateRecord({
      recordType: 'Steps',
      timeRangeFilter: { operator: 'between', startTime, endTime },
      // No origin filter: Health Connect resolves Samsung/phone overlap via its aggregate priorities.
    });
    const steps = aggregate.COUNT_TOTAL ?? 0;
    if (!Number.isSafeInteger(steps) || steps < 0) throw new Error('Invalid Health Connect step total');
    return { steps, localDate, source: 'health-connect' };
  },
};
