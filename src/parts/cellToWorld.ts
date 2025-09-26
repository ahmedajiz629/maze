import { Vector3 } from "@babylonjs/core";

export const cellToWorld = (config: { TILE: number }, i: number, j: number, y: number = 0): Vector3 => {
  const { TILE } = config;
  return new Vector3(i * TILE, y, j * TILE);
}