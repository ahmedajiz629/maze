import { AbstractMesh, Mesh, Scene } from "@babylonjs/core";
import { cellToWorld } from "./cellToWorld";
import { createBox, createDoor, createKey, createLava, createWall } from "./units";
import { createExit } from "./units/exit";

export const initMap = async (scene: Scene, config: { MAP: string[], WALL_H: number, TILE: number },
  units: { wallUnit: Mesh, boxUnit: Mesh },
  state: {
    blocked: Set<string>,
    boxes: Map<string, AbstractMesh>,
    doors: Map<string, AbstractMesh>,
    keys: Map<string, AbstractMesh>,
    lava: Map<string, AbstractMesh>
  }) => {
  const W = config.MAP[0].length;
  const H = config.MAP.length;

  let exitCell: { x: number; y: number } | false = false;
  let spawnCell: { x: number; y: number } | false = false;

  const keyPromises: Promise<void>[] = [];
  const doorPromises: Promise<void>[] = [];

  for (let j = 0; j < H; j++) {
    for (let i = 0; i < W; i++) {
      const ch = config.MAP[j][i];
      const p = cellToWorld(config, i, j);

      switch (ch) {
        case "#":
          createWall(config, i, j, p, units, state);
          break;
        case "B":
          createBox(config, i, j, p, units, state);
          break;
        case "D":
          doorPromises.push(createDoor(scene, config, i, j, p, state));
          break;
        case "K":
          keyPromises.push(createKey(scene, config, i, j, p, state));
          break;
        case "~":
          createLava(scene, config, i, j, p, state);
          break;
        case "E":
          createExit(scene, config, i, j, p);
          exitCell = { x: i, y: j };
          break;
        case "S":
          spawnCell = { x: i, y: j };
          break;
      }
    }
  }

  // Wait for all keys and doors to load
  await Promise.all([...keyPromises, ...doorPromises]);

  if (!spawnCell || !exitCell) {
    throw new Error("Map must include S (spawn) and E (exit).");
  }
  return { spawnCell, exitCell };
}