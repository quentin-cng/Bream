export type StepSourceName = 'health-connect' | 'mock';

export type StepSnapshot = {
  steps: number;
  localDate: string;
  source: StepSourceName;
};

export type StepSourceStatus = 'connected' | 'permission-required' | 'denied' | 'unavailable' | 'no-data' | 'mock' | 'error';

export interface StepSource {
  getStatus(): Promise<StepSourceStatus>;
  connect(): Promise<StepSourceStatus>;
  getTodayStepSnapshot(): Promise<StepSnapshot | null>;
}

export function getLocalDate(now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getLocalDayRange(now = new Date()): { localDate: string; startTime: string; endTime: string } {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return { localDate: getLocalDate(now), startTime: start.toISOString(), endTime: now.toISOString() };
}
