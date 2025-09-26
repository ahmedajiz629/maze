import { Color3, Mesh, MeshBuilder, Scene, StandardMaterial, Vector3 } from "@babylonjs/core";

export const makeExit = (scene: Scene, config: { TILE: number }) => {
  const exitGroup = new Mesh(`exitGroup`, scene);

  // Main exit platform
  const exitPlatform = MeshBuilder.CreateBox(
    `exitPlatform`,
    { width: config.TILE * 0.9, depth: config.TILE * 0.9, height: 0.1 },
    scene
  );
  exitPlatform.position.y = 0;
  exitPlatform.parent = exitGroup;

  // Glowing border
  const exitBorder = MeshBuilder.CreateTorus(
    `exitBorder`,
    { diameter: config.TILE * 0.85, thickness: 0.05, tessellation: 32 },
    scene
  );
  exitBorder.position.y = 0.08;
  exitBorder.parent = exitGroup;

  // Central glowing orb
  const exitOrb = MeshBuilder.CreateSphere(
    `exitOrb`,
    { diameter: 0.4 },
    scene
  );
  exitOrb.position.y = 0.25;
  exitOrb.parent = exitGroup;

  // Floating rings around the orb
  const ring1 = MeshBuilder.CreateTorus(
    `exitRing1`,
    { diameter: 0.6, thickness: 0.02, tessellation: 24 },
    scene
  );
  ring1.position.y = 0.25;
  ring1.parent = exitGroup;

  const ring2 = MeshBuilder.CreateTorus(
    `exitRing2`,
    { diameter: 0.8, thickness: 0.015, tessellation: 24 },
    scene
  );
  ring2.position.y = 0.25;
  ring2.parent = exitGroup;

  // Materials
  const exitMaterial = new StandardMaterial(`exitMat`, scene);
  exitMaterial.diffuseColor = new Color3(0.2, 0.8, 0.3); // Green
  exitMaterial.emissiveColor = new Color3(0.3, 0.9, 0.4); // Glowing green

  const orbMaterial = new StandardMaterial(`exitOrbMat`, scene);
  orbMaterial.diffuseColor = new Color3(0.4, 1.0, 0.5); // Bright green
  orbMaterial.emissiveColor = new Color3(0.6, 1.0, 0.7); // Very bright glow

  const ringMaterial = new StandardMaterial(`exitRingMat`, scene);
  ringMaterial.diffuseColor = new Color3(0.8, 1.0, 0.8); // Light green
  ringMaterial.emissiveColor = new Color3(0.5, 1.0, 0.6); // Bright glow
  ringMaterial.alpha = 0.7; // Semi-transparent

  exitPlatform.material = exitMaterial;
  exitBorder.material = exitMaterial;
  exitOrb.material = orbMaterial;
  ring1.material = ringMaterial;
  ring2.material = ringMaterial;

  // Animation
  scene.onBeforeRenderObservable.add(() => {
    const time = performance.now() * 0.001;

    // Rotate rings in opposite directions
    ring1.rotation.y = time * 0.8;
    ring2.rotation.y = -time * 1.2;
    ring1.rotation.x = Math.sin(time * 0.5) * 0.2;
    ring2.rotation.x = Math.cos(time * 0.7) * 0.15;

    // Bob the orb up and down
    exitOrb.position.y = 0.25 + Math.sin(time * 2) * 0.05;

    // Pulsing glow effect
    const glowIntensity = 0.8 + 0.4 * Math.sin(time * 3);
    orbMaterial.emissiveColor = new Color3(
      0.6 * glowIntensity,
      1.0 * glowIntensity,
      0.7 * glowIntensity
    );
  });

  return exitGroup;
}

export const createExit = (scene: Scene, config: { TILE: number }, i: number, j: number, p: Vector3): void => {
  const exitGroup = makeExit(scene, config);
  exitGroup.position = p.add(new Vector3(0, 0.1, 0));
}