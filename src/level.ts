export type ActionName = 'step' | 'toggle' | 'left' | 'right' | 'safe' | 'notDone' | 'checkLeft' | 'checkRight';
export type Level = {
  MAP: string[],
  TIME_MS?: number, 
  EXTRA_DOOR_TS?: number,
  EXTRA_LEVER_TS?: number,
  ROTATION?: number,
  functions?: ActionName[]
} | {
  MAP?: undefined,
  code: string
};

export type Levels = Record<string, () => Level>;