import { AbstractMesh, ImportMeshAsync, Mesh, Scene, Vector3 } from "@babylonjs/core";
import { keyOf } from "../keyOf";


export const makeDoor = async (scene: Scene, config: { TILE: number, WALL_H: number }) => {
  const result = await ImportMeshAsync("assets/models/door.glb", scene);

  // Create a parent mesh for the imported stone door model
  const doorGroup_ = new Mesh(`stoneDoor$`, scene);
  doorGroup_.position = new Vector3(config.TILE * 0.25, config.TILE * 0.5, config.TILE * 0.25);
  doorGroup_.rotation.y = 0; // -Math.PI / 2 If open
  // Parent all imported meshes to our door group
  result.meshes.forEach(mesh => {
    if (mesh.name === "__root__") {
      mesh.parent = doorGroup_;
      // Scale the door to fit the tile size
      const x = 3.5
      mesh.scaling = new Vector3(x, x, x); // Adjust scaling as needed
      mesh.position = new Vector3(.9 - config.TILE * 0.25, -1.5, 1 - config.TILE * 0.25); // Adjust scaling as needed
    }
  });

  const doorGroup = new Mesh(`stoneDoor`, scene);
  doorGroup_.parent = doorGroup;
  return doorGroup;
}

export const createDoor = async function (
  scene: Scene,
  config: { TILE: number, WALL_H: number }, i: number, j: number, p: Vector3,
  state: { blocked: Set<string>, doors: Map<string, AbstractMesh> }
): Promise<void> {
  const doorGroup = await makeDoor(scene, { TILE: config.TILE, WALL_H: config.WALL_H });
  doorGroup.position = p;
  state.doors.set(keyOf(i, j), doorGroup);
  state.blocked.add(keyOf(i, j));
}