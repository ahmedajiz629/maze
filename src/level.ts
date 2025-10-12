export type ActionName = 'step' | 'toggle' | 'left' | 'right' | 'safe' | 'unDone' | 'checkLeft' | 'checkRight';
export type Level = {
  MAP: string[],
  TIME_MS?: number, 
  ROTATION?: number,
  functions?: ActionName[]
};

export type Levels = Record<string, () => Level>;