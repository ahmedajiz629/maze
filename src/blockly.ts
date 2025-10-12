import { ActionName, Levels } from "./level";


const functions: ActionName[] = ['step', 'left', 'right', 'safe', 'notDone', 'checkRight', 'checkLeft'] as const;

export const levels: Levels = {
  8: () => ({
    MAP: [
      "#######",
      "#....##",
      "#.##..#",
      "#...#.#",
      "###.#.#",
      "#S..#E#",
      "#######",
    ].map(x=>[...x].reverse().join('')),
    ROTATION: Math.PI,
    functions
  }),
  10: () => ({
    MAP: [
      "########",
      "#..#E#.#",
      "#..#...#",
      "#.#.#.##",
      "#......#",
      "###.##.#",
      "#S...#.#",
      "########",
    ].map(x=>[...x].reverse().join('')),
    ROTATION: Math.PI,
    functions
  }),
}