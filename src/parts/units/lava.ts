import { AbstractMesh, Color3, Mesh, MeshBuilder, Scene, StandardMaterial, Texture, Vector3 } from "@babylonjs/core";
import { initGifAnimation } from "../gif";
import { keyOf } from "../keyOf";

export const makeLava = (scene: Scene, config: { TILE: number }) => {
  // Create a simple plane for the lava
  const lavaPlane = MeshBuilder.CreatePlane(
    `lava`,
    { width: config.TILE, height: config.TILE },
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
  const teardown = initGifAnimation(scene, lavaMaterial, "assets/models/lava.gif");
  lavaPlane.onDisposeObservable.add(() => {
    teardown.then((cb) => {
      cb();
    });
  });

  return lavaPlane;

}

export const createLava = (
  scene: Scene,
  config: { TILE: number }, 
  i: number, 
  j: number, 
  p: Vector3,
  state: { 
    lava: Map<string, { mesh: AbstractMesh, interval: number | null, isPassable: boolean }>,
  },
  interval: number | null // 0-9
): void => {
  // Use the existing makeLava function to create the lava mesh
  const lavaGroup = makeLava(scene, config);
  lavaGroup.position = p.add(new Vector3(0, 0.01, 0));
  
  // Store in timed lava collection
  state.lava.set(keyOf(i, j), {
    mesh: lavaGroup,
    interval: interval,
    isPassable: false
  });
  
}
