import { AbstractMesh, Mesh, Scene } from "@babylonjs/core";
import { cellToWorld } from "./cellToWorld";
import { createAutoDoor, createBox, createDoor, createKey, createLava, createWall, createButton } from "./units";
import { createExit } from "./units/exit";

export const initMap = async (scene: Scene, config: { MAP: string[], WALL_H: number, TILE: number },
  units: { wallUnit: Mesh },
  state: {
    blocked: Set<string>,
    boxes: Map<string, AbstractMesh>,
    doors: Map<string, AbstractMesh>,
    autoDoors: Map<string, AbstractMesh>,
    keys: Map<string, AbstractMesh>,
    lava: Map<string, AbstractMesh>,
    buttons: Map<string, { mesh: AbstractMesh, direction: number, toggled: boolean }>
  }) => {
  const W = config.MAP[0].length;
  const H = config.MAP.length;

  let exitCell: { x: number; y: number } | false = false;
  let spawnCell: { x: number; y: number } | false = false;

  const promises: Promise<void>[] = [];

  for (let j = 0; j < H; j++) {
    for (let i = 0; i < W; i++) {
      const ch = config.MAP[j][i];
      const p = cellToWorld(config, i, j);

      switch (ch) {
        case "#":
          createWall(config, i, j, p, units, state);
          break;
        case "B":
          promises.push(createBox(scene, config, i, j, p, state));
          break;
        case "D":
          promises.push(createDoor(scene, config, i, j, p, state, false));
          break;
        case "d":
          promises.push(createDoor(scene, config, i, j, p, state, true));
          break;
        case "A":
          promises.push(createAutoDoor(scene, config, i, j, p, state, false));
          break;
        case "a":
          promises.push(createAutoDoor(scene, config, i, j, p, state, true));
          break;
        case "K":
          promises.push(createKey(scene, config, i, j, p, state));
          break;
        case "T": // Button facing right
          promises.push(createButton(scene, config, i, j, p, state, 'T'));
          break;
        case "t": // Button facing left
          promises.push(createButton(scene, config, i, j, p, state, 't'));
          break;
        case "Y": // Button facing up  
          promises.push(createButton(scene, config, i, j, p, state, 'Y'));
          break;
        case "y": // Button facing down
          promises.push(createButton(scene, config, i, j, p, state, 'y'));
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
  await Promise.all(promises);

  if (!spawnCell || !exitCell) {
    throw new Error("Map must include S (spawn) and E (exit).");
  }
  return { spawnCell, exitCell };
}