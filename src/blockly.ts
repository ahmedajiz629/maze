import { Levels } from "./level";

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
    ROTATION: Math.PI
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
    ROTATION: Math.PI
  }),
}