import { AbstractMesh, Color3, InstancedMesh, Mesh, MeshBuilder, Scene, StandardMaterial, Vector3 } from "@babylonjs/core";
import { keyOf } from "../keyOf";


export const makeBox = (scene: Scene, config: { TILE: number }) => {
  const matBox = new StandardMaterial("box", scene);
  matBox.diffuseColor = new Color3(0.63, 0.47, 0.35);
  const boxUnit = MeshBuilder.CreateBox(
    "boxUnit",
    { width: config.TILE * 0.98, depth: config.TILE * 0.98, height: config.TILE * 0.98 },
    scene
  );
  boxUnit.material = matBox;
  boxUnit.isVisible = false;
  return boxUnit;
}



export const createBox = (
  config: { TILE: number }, i: number, j: number, p: Vector3,
  units: { boxUnit: Mesh },
  state: {
    blocked: Set<string>,
    boxes: Map<string, AbstractMesh>
  }
): void => {
  const inst = units.boxUnit.createInstance(`b_${i}_${j}`);
  inst.position = p.add(new Vector3(0, config.TILE * 0.49, 0));
  state.boxes.set(keyOf(i, j), inst);
  state.blocked.add(keyOf(i, j));
}