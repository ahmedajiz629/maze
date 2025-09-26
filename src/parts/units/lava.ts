import { AbstractMesh, Color3, Mesh, MeshBuilder, Scene, StandardMaterial, Texture, Vector3 } from "@babylonjs/core";
import { initGifAnimation } from "../gif";
import { keyOf } from "../keyOf";

export const makeLava = (scene: Scene, config: { TILE: number }) => {
  // Create a simple plane for the lava
  const lavaPlane = MeshBuilder.CreatePlane(
    `lava`,
    { width: config.TILE * 0.95, height: config.TILE * 0.95 },
    scene
  );

  // Rotate to lie flat on the ground
  lavaPlane.rotation.x = Math.PI / 2;
  lavaPlane.position.y = 0.01; // Slightly above ground to avoid z-fighting

  // Create material with animated GIF texture
  const lavaMaterial = new StandardMaterial(`lavaMat`, scene);
  const lavaTexture = new Texture("assets/models/lava.gif", scene);

  lavaMaterial.diffuseTexture = lavaTexture;
  lavaMaterial.emissiveTexture = lavaTexture; // Make it glow
  lavaMaterial.emissiveColor = new Color3(0.3, 0.1, 0.05); // Subtle glow tint

  lavaPlane.material = lavaMaterial;

  // Initialize GIF animation with material reference
  initGifAnimation(scene, lavaMaterial, "assets/models/lava.gif");

  return lavaPlane;

}

export const createLava = (scene: Scene, config: { TILE: number }, i: number, j: number, p: Vector3, state: { lava: Map<string, AbstractMesh> }): void => {
  const lavaGroup = makeLava(scene, { TILE: config.TILE });
  lavaGroup.position = p.add(new Vector3(0, 0.1, 0));
  state.lava.set(keyOf(i, j), lavaGroup);
};
