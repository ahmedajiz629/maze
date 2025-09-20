import {
  Scene,
  Mesh,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Vector3
} from "@babylonjs/core";

export interface Player {
  x: number;
  y: number;
  keys: number;
  keysByColor: Map<string, number>; // Track keys by color
  mesh: Mesh;
  moving: boolean;
}

export class PlayerFactory {
  private scene: Scene;

  constructor(scene: Scene) {
    this.scene = scene;
  }

  createRealisticPlayer(): Mesh {
    // Create a compound player mesh with body parts
    const playerGroup = new Mesh("playerGroup", this.scene);
    
    // Body (main torso)
    const body = MeshBuilder.CreateBox(
      "playerBody",
      { width: 0.6, height: 1.2, depth: 0.4 },
      this.scene
    );
    body.position.y = 0.6; // Center the body
    body.parent = playerGroup;
    
    // Head
    const head = MeshBuilder.CreateSphere(
      "playerHead",
      { diameter: 0.4 },
      this.scene
    );
    head.position.y = 1.4; // On top of body
    head.parent = playerGroup;
    
    // Eyes (to show direction)
    const leftEye = MeshBuilder.CreateSphere(
      "leftEye",
      { diameter: 0.08 },
      this.scene
    );
    leftEye.position = new Vector3(-0.1, 1.45, 0.15);
    leftEye.parent = playerGroup;
    
    const rightEye = MeshBuilder.CreateSphere(
      "rightEye",
      { diameter: 0.08 },
      this.scene
    );
    rightEye.position = new Vector3(0.1, 1.45, 0.15);
    rightEye.parent = playerGroup;
    
    // Nose (pointing forward to show direction)
    const nose = MeshBuilder.CreateBox(
      "nose",
      { width: 0.06, height: 0.06, depth: 0.12 },
      this.scene
    );
    nose.position = new Vector3(0, 1.4, 0.2);
    nose.parent = playerGroup;
    
    // Arms
    const leftArm = MeshBuilder.CreateBox(
      "leftArm",
      { width: 0.2, height: 0.8, depth: 0.2 },
      this.scene
    );
    leftArm.position = new Vector3(-0.5, 0.8, 0);
    leftArm.parent = playerGroup;
    
    const rightArm = MeshBuilder.CreateBox(
      "rightArm",
      { width: 0.2, height: 0.8, depth: 0.2 },
      this.scene
    );
    rightArm.position = new Vector3(0.5, 0.8, 0);
    rightArm.parent = playerGroup;
    
    // Legs
    const leftLeg = MeshBuilder.CreateBox(
      "leftLeg",
      { width: 0.25, height: 0.8, depth: 0.25 },
      this.scene
    );
    leftLeg.position = new Vector3(-0.15, -0.4, 0);
    leftLeg.parent = playerGroup;
    
    const rightLeg = MeshBuilder.CreateBox(
      "rightLeg",
      { width: 0.25, height: 0.8, depth: 0.25 },
      this.scene
    );
    rightLeg.position = new Vector3(0.15, -0.4, 0);
    rightLeg.parent = playerGroup;

    // Apply materials
    const bodyMaterial = new StandardMaterial("playerBodyMat", this.scene);
    bodyMaterial.diffuseColor = new Color3(0.2, 0.4, 0.8); // Blue shirt
    body.material = bodyMaterial;
    leftArm.material = bodyMaterial;
    rightArm.material = bodyMaterial;

    const skinMaterial = new StandardMaterial("playerSkinMat", this.scene);
    skinMaterial.diffuseColor = new Color3(0.9, 0.7, 0.6); // Skin tone
    head.material = skinMaterial;

    const eyeMaterial = new StandardMaterial("playerEyeMat", this.scene);
    eyeMaterial.diffuseColor = new Color3(0.1, 0.1, 0.1); // Dark eyes
    leftEye.material = eyeMaterial;
    rightEye.material = eyeMaterial;

    const noseMaterial = new StandardMaterial("playerNoseMat", this.scene);
    noseMaterial.diffuseColor = new Color3(0.8, 0.6, 0.5); // Slightly darker skin
    nose.material = noseMaterial;

    const pantsMaterial = new StandardMaterial("playerPantsMat", this.scene);
    pantsMaterial.diffuseColor = new Color3(0.3, 0.3, 0.3); // Dark pants
    leftLeg.material = pantsMaterial;
    rightLeg.material = pantsMaterial;

    return playerGroup;
  }
}
