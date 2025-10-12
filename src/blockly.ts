import { ActionName, Levels } from "./level";


const functions: ActionName[] = ['step', 'left', 'right', 'safe', 'notDone', 'checkRight', 'checkLeft'] as const;

export const levels: Levels = {
  1: () => ({
    MAP: [
      "#######",
      "#######",
      "#######",
      "#######",
      "##S.E##",
      "#######",
      "#######",
    ].map(x=>[...x].reverse().join('')),
    ROTATION: Math.PI,
    functions
  }),
  2: () => ({
    MAP: [
      "########",
      "########",
      "########",
      "###.E###",
      "##S.####",
      "########",
      "########",
      "########",
    ].map(x=>[...x].reverse().join('')),
    ROTATION: Math.PI,
    functions
  }),
  3: () => ({
    MAP: [
      "########",
      "########",
      "########",
      "########",
      "#S....E#",
      "########",
      "########",
      "########",
    ].map(x=>[...x].reverse().join('')),
    ROTATION: Math.PI,
    functions
  }),
  4: () => ({
    MAP: [
      "#######.",
      "######..",
      "#####E.#",
      "####..##",
      "###..###",
      "##..####",
      "#S.#####",
      "........",
    ].map(x=>[...x].reverse().join('')),
    ROTATION: Math.PI,
    functions
  }),
  5: () => ({
    MAP: [
      "########",
      "#####E##",
      "#####.##",
      "#####.##",
      "#####.##",
      "#####.##",
      "###S..##",
      "########",
    ].map(x=>[...x].reverse().join('')),
    ROTATION: Math.PI,
    functions
  }),
  6: () => ({
    MAP: [
      "########",
      "########",
      "#.....##",
      "#.###.##",
      "#..E#.##",
      "#####.##",
      "#S....##",
      "########",
    ].map(x=>[...x].reverse().join('')),
    ROTATION: Math.PI,
    functions
  }),
  7: () => ({
    MAP: [
      "########",
      "#####..#",
      "#S....##",
      "#####..#",
      "###E#..#",
      "##.##..#",
      "##......#",
      "########",
    ].map(x=>[...x].reverse().join('')),
    ROTATION: Math.PI,
    functions
  }),
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
  9: () => ({
    MAP: [
      "########",
      "#.....##",
      "##.###.#",
      "E......#",
      "#.#.#.##",
      "....#.##",
      "#S.##.##",
      "########",
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