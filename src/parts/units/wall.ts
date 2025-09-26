import { Mesh, MeshBuilder, Scene, StandardMaterial, Texture, Vector3 } from "@babylonjs/core";
import { keyOf } from "../keyOf";

type Config = {
  TILE: number;
  WALL_H: number;
}

export const makeWallUnit = (scene: Scene, config: Config) => {
  const matWall = new StandardMaterial("wall", scene);
  const wallTexture = new Texture("assets/models/wall.png", scene);
  matWall.diffuseTexture = wallTexture;
  const wallUnit = MeshBuilder.CreateBox(
    "wallUnit",
    { width: config.TILE, depth: config.TILE, height: config.WALL_H },
    scene
  );
  wallUnit.material = matWall;
  wallUnit.isVisible = false;
  return wallUnit;
}

export const createWall = (config: { WALL_H: number }, i: number, j: number, p: Vector3, units: { wallUnit: Mesh }, state: { blocked: Set<string> }): void => {
  const inst = units.wallUnit.createInstance(`w_${i}_${j}`);
  inst.position = p.add(new Vector3(0, config.WALL_H / 2, 0));
  state.blocked.add(keyOf(i, j));
}