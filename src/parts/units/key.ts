import { AbstractMesh, ImportMeshAsync, Mesh, Scene, Vector3 } from "@babylonjs/core";
import { keyOf } from "../keyOf";


export const makeKey = async (scene: Scene) => {
  // Import the skeleton key GLB model
  const result = await ImportMeshAsync("assets/models/minecraft_key.glb", scene);

  // Create a parent mesh for the imported model
  const keyGroup = new Mesh(`externalKey_`, scene);

  // Parent all imported meshes to our key group and apply color tint
  result.meshes.forEach((mesh) => {
    if (mesh.name === "__root__") {
      mesh.parent = keyGroup;
    }
  });
  const keyGroup2 = new Mesh(`externalKey`, scene);
  keyGroup.rotation.z = Math.PI / 2; // Rotate 90 degrees around Y axis
  keyGroup.parent = keyGroup2;
  return keyGroup2;
}


export const createKey = async (scene: Scene, config: { TILE: number }, i: number, j: number, p: Vector3, state: { keys: Map<string, AbstractMesh> }): Promise<void> => {
  // Load the external skeleton key model
  const keyGroup = await makeKey(scene);
  keyGroup.position = p.add(new Vector3(0, config.TILE * 0.5, 0)); // Raise it higher to be more visible
  state.keys.set(keyOf(i, j), keyGroup);
}