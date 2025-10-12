export type ActionName = 'step' | 'toggle' | 'left' | 'right' | 'safe' | 'unDone' | 'checkLeft' | 'checkRight';
export type Level = {
  MAP: string[],
  TIME_MS?: number, 
  EXTRA_DOOR_TS?: number,
  EXTRA_LEVER_TS?: number,
  ROTATION?: number,
  functions?: ActionName[]
};

export type Levels = Record<string, () => Level>;