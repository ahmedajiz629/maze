import { AbstractMesh, ImportMeshAsync, Mesh, Scene, Vector3 } from "@babylonjs/core";


export const makePlayer = async (scene: Scene): Promise<AbstractMesh> => {
  const result = await ImportMeshAsync(
    "./assets/models/happy.glb",
    scene,
  );

  if (result.meshes.length === 0) {
    throw new Error("No meshes found in the asset file");
  }

  // Get the root mesh or create a parent if multiple meshes
  let playerMesh = new Mesh("playerGroup", scene);
  result.meshes.forEach((mesh: AbstractMesh) => {
    if (mesh.name !== "__root__") {
      mesh.parent = playerMesh;
    }
  });

  playerMesh.scaling = new Vector3(0.5, 0.5, 0.5);
  playerMesh.position.y = 0.1;

  // Ensure the model faces forward (adjust rotation if needed)
  playerMesh.rotation.x = -Math.PI / 2;
  playerMesh.rotation.z = Math.PI;
  playerMesh.position.z = 100;

  return playerMesh;
}