import { AbstractMesh, Color3, ImportMeshAsync, InstancedMesh, Mesh, MeshBuilder, Scene, StandardMaterial, Vector3 } from "@babylonjs/core";
import { keyOf } from "../keyOf";


export const makeBox = async (scene: Scene, config: { TILE: number }) => {
  // Import the minecraft box GLB model
  const result = await ImportMeshAsync("assets/models/minecraft_box.glb", scene);

  // Create a parent mesh for the imported model
  const boxGroup = new Mesh(`minecraftBox_`, scene);

  // Parent all imported meshes to our box group
  result.meshes.forEach((mesh) => {
    if (mesh.name === "__root__") {
      mesh.parent = boxGroup;
    }
  });
  const h = .43
  boxGroup.scaling = new Vector3(h, h, h);
  boxGroup.rotation.y = .24;
  boxGroup.position.y = - 0.5 * config.TILE;
  const boxGroup2 = new Mesh(`minecraftBox`, scene);
  boxGroup.parent = boxGroup2;
  return boxGroup2;
}



export const createBox = async (
  scene: Scene, config: { TILE: number }, i: number, j: number, p: Vector3,
  state: {
    blocked: Set<string>,
    boxes: Map<string, AbstractMesh>
  }
): Promise<void> => {
  const boxGroup = await makeBox(scene, config);

  // Clone the minecraft box template instead of creating instance
  boxGroup.position = p.add(new Vector3(0, config.TILE * 0.5, 0));
  state.boxes.set(keyOf(i, j), boxGroup);
  state.blocked.add(keyOf(i, j));
}