import { AbstractMesh, Color3, ImportMeshAsync, Mesh, PBRMaterial, SpotLight, Scene, StandardMaterial, Vector3 } from "@babylonjs/core";
import { keyOf } from "../keyOf";


const makeDoor = async (scene: Scene, config: { TILE: number, WALL_H: number }) => {
  const result = await ImportMeshAsync("assets/models/snake_doors.glb", scene);

  // Create a parent mesh for the imported stone door model
  const doorGroup_ = new Mesh(`stoneDoor$`, scene);
  doorGroup_.position = new Vector3(config.TILE * 0.25, config.TILE * 0.5, config.TILE * 0.25);
  doorGroup_.rotation.y = 0; // -Math.PI / 2 If open
  // Parent all imported meshes to our door group
  const doorGroupDeep = new Mesh(`stoneDoorDeep`, scene);
  doorGroupDeep.parent = doorGroup_;
  doorGroupDeep.rotation.x = 0 * -Math.PI / 2; // Lay flat on ground
  doorGroupDeep.position = new Vector3(-config.TILE * .75, config.TILE * 0.5, -config.TILE * .8);
  result.meshes.forEach(mesh => {
    if (mesh.name === "__root__") {
      mesh.parent = doorGroupDeep;
      // Scale the door to fit the tile size
      const h = 0.07
      mesh.scaling = new Vector3(h, h, h); // Adjust scaling as needed
      mesh.position = new Vector3(.9 - config.TILE * 0.25, -1.5, 1 - config.TILE * 0.25); // Adjust scaling as needed
    }

    // Add local spot light next to the door for wider coverage
    if (mesh.name === "__root__") {
      const doorLight = new SpotLight(
        "doorLight", 
        new Vector3(1, -1, 2), 
        new Vector3(0, 0, -1), // Direction pointing down and toward door
        Math.PI / 3, // Wide angle (60 degrees)
        20, // Exponent for light falloff
        scene
      );
      doorLight.diffuse = new Color3(1, 0.9, 0.7); // Warm white light
      doorLight.specular = new Color3(1, 0.9, 0.7);
      doorLight.intensity = 8; // Higher intensity for spot light
      doorLight.range = config.TILE * 3; // Much wider range
      doorLight.parent = doorGroupDeep; // Attach to door so it moves with it
    }
      });

  const doorGroup = new Mesh(`stoneDoor`, scene);
  doorGroup_.parent = doorGroup;
  return doorGroup;
}

export const createAutoDoor = async function (
  scene: Scene,
  config: { TILE: number, WALL_H: number }, i: number, j: number, p: Vector3,
  state: { blocked: Set<string>, autoDoors: Map<string, AbstractMesh> },
  rotated: boolean = false
): Promise<void> {
  const doorGroup = await makeDoor(scene, { TILE: config.TILE, WALL_H: config.WALL_H });
  doorGroup.position = p;
  
  // Apply rotation for "d" doors
  if (rotated) {
    doorGroup.rotation.y = Math.PI / 2; // Rotate 90 degrees
  }
  
  state.autoDoors.set(keyOf(i, j), doorGroup);
  state.blocked.add(keyOf(i, j));
}