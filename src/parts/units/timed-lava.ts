import { AbstractMesh, Vector3, Scene } from "@babylonjs/core";
import { keyOf } from "../keyOf";
import { makeLava } from "./lava";

export const createTimedLava = (
  scene: Scene,
  config: { TILE: number }, 
  i: number, 
  j: number, 
  p: Vector3,
  state: { 
    timedLava: Map<string, { mesh: AbstractMesh, interval: number, isPassable: boolean }>,
    blocked: Set<string>
  },
  interval: number // 0-9
): void => {
  // Use the existing makeLava function to create the lava mesh
  const timedLavaPlate = makeLava(scene, config);
  timedLavaPlate.position = p.add(new Vector3(0, 0.1, 0));
  
  // Store in timed lava collection
  state.timedLava.set(keyOf(i, j), {
    mesh: timedLavaPlate,
    interval: interval,
    isPassable: false
  });
  
  // Initially blocked
  state.blocked.add(keyOf(i, j));
}
