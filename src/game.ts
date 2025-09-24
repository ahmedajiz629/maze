import {
  Engine,
  Scene,
  Vector3,
  Color4,
  Color3,
  HemisphericLight,
  ArcRotateCamera,
  MeshBuilder,
  Mesh,
  StandardMaterial,
  AbstractMesh,
  Observer,
  SceneLoader,
  ImportMeshAsync,
  Texture,
  DynamicTexture,
  VideoTexture,
  PBRMaterial
} from '@babylonjs/core';
import '@babylonjs/loaders'; // This adds the loaders to the scene
import { GridMaterial } from '@babylonjs/materials';
import { Player, PlayerFactory } from './Player';

// Types
interface Position {
  x: number;
  y: number;
}

// Define key colors
const KEY_COLORS = [
  { name: 'gold', emissive: new Color3(0.4, 0.34, 0.0), diffuse: new Color3(0.6, 0.5, 0.2) },
  { name: 'silver', emissive: new Color3(0.3, 0.3, 0.35), diffuse: new Color3(0.5, 0.5, 0.55) },
  { name: 'copper', emissive: new Color3(0.4, 0.2, 0.08), diffuse: new Color3(0.55, 0.3, 0.15) },
  { name: 'emerald', emissive: new Color3(0.08, 0.4, 0.16), diffuse: new Color3(0.1, 0.45, 0.2) },
  { name: 'ruby', emissive: new Color3(0.4, 0.08, 0.12), diffuse: new Color3(0.5, 0.1, 0.15) },
  { name: 'sapphire', emissive: new Color3(0.08, 0.16, 0.4), diffuse: new Color3(0.1, 0.2, 0.5) }
];

class GridPuzzle3D {
  private readonly MAP = [
    "...#################",
    ".S....#...........E#",
    "#~##.#.#####.#######",
    "#~...#.....#.......#",
    "###.###.#.#.###.#..#",
    "#..B....#.#...#.#..#",
    "#D#~#####.#.#.#.#..#",
    "#...K.....#.#.#....#",
    "#####.#####.#.####.#",
    "#.....#.....#......#",
    "#.###.#.###.#####..#",
    "#.#...#...#.....#..#",
    "#.#.#####.#####.#..#",
    "#.#.......#...#.#..#",
    "#.#######.#.#.#.#..#",
    "#.....~...#.#.#....#",
    "###.###.###.#.######",
    "#.....#.....#......#",
    "#.D...#.K...#..B...#",
    "####################",
  ];

  private readonly TILE = 2; // world units per grid cell
  private readonly FLOOR_Y = 0; // floor plane Y
  private readonly WALL_H = 2; // wall height
  private readonly MOVE_MS = 140; // move tween duration
  private readonly PUSH_MS = 120; // box push tween duration

  private engine!: Engine;
  private scene!: Scene;
  private canvas: HTMLCanvasElement;
  private camera!: ArcRotateCamera;

  // Game state
  private readonly W: number;
  private readonly H: number;
  private player!: Player;
  private playerFactory!: PlayerFactory;
  private spawnCell!: Position;
  private exitCell!: Position;

  // Collections
  private blocked = new Set<string>();
  private doors = new Map<string, AbstractMesh>();
  private boxes = new Map<string, AbstractMesh>();
  private keys = new Map<string, AbstractMesh>();
  private keyColors = new Map<string, string>(); // Track key colors by position
  private lava = new Map<string, AbstractMesh>();

  // UI elements
  private hudElement: HTMLElement;
  private bannerElement: HTMLElement;

  // Materials
  private matFloor!: StandardMaterial;
  private matWall!: StandardMaterial;
  private matBox!: StandardMaterial;
  private matDoor!: StandardMaterial;
  private matKey!: StandardMaterial;
  private matLava!: StandardMaterial;
  private matExit!: StandardMaterial;
  private matPlayer!: StandardMaterial;

  // Mesh templates
  private wallUnit!: Mesh;
  private boxUnit!: Mesh;
  private doorUnit!: Mesh;
  private keyUnit!: Mesh;

  constructor() {
    this.W = this.MAP[0].length;
    this.H = this.MAP.length;
    this.canvas = document.getElementById("c") as HTMLCanvasElement;
    this.hudElement = document.getElementById("hud") as HTMLElement;
    this.bannerElement = document.getElementById("banner") as HTMLElement;

    if (!this.canvas || !this.hudElement || !this.bannerElement) {
      throw new Error("Required HTML elements not found");
    }

    this.initEngine();
    this.initScene();
    this.initMaterials();
    this.initGeometry();

    // Initialize map and load player asynchronously
    this.initializeGameAsync();
  }

  private async initializeGameAsync(): Promise<void> {
    try {
      // Initialize the map (this will load all keys)
      await this.initMap();

      // Create a temporary invisible player for camera setup
      this.initTemporaryPlayer();
      this.initCamera();
      this.initInput();

      // Replace with real player asynchronously
      await this.loadRealPlayer();
      this.placePlayer(this.player.x, this.player.y);
      this.start();
    } catch (error) {
      console.error("Failed to initialize game:", error);
      this.showBanner("Game initialization failed - please refresh the page");
    }
  }

  private initTemporaryPlayer(): void {
    // Create a simple invisible placeholder for camera setup
    const tempMesh = MeshBuilder.CreateBox("tempPlayer", { size: 1 }, this.scene);
    tempMesh.visibility = 0; // Make it invisible

    this.player = {
      x: this.spawnCell.x,
      y: this.spawnCell.y,
      keys: 0,
      keysByColor: new Map<string, number>(),
      mesh: tempMesh,
      moving: false,
      rotation: 0 // Start facing right (0 radians)
    };

    this.placePlayer(this.player.x, this.player.y);
  }

  private async loadRealPlayer(): Promise<void> {
    try {
      // Load the real player
      const realPlayerMesh = await this.playerFactory.createRealisticPlayer();

      // Replace the temporary player
      if (this.player.mesh) {
        this.player.mesh.dispose();
      }

      this.player.mesh = realPlayerMesh;
      this.placePlayer(this.player.x, this.player.y);

      // Update camera target
      this.camera.setTarget(realPlayerMesh.position);

      this.showBanner("Player loaded! Use arrow keys or WASD to move.");
    } catch (error) {
      console.error("Failed to load real player:", error);
      // Keep the temporary player but make it visible as fallback
      this.player.mesh.visibility = 1;
      const fallbackMaterial = new StandardMaterial("fallbackMat", this.scene);
      fallbackMaterial.diffuseColor = new Color3(0.5, 0.5, 1);
      this.player.mesh.material = fallbackMaterial;
      this.showBanner("Using fallback player. Use arrow keys or WASD to move.");
    }
  }

  private initEngine(): void {
    this.canvas.style.width = "100%";
    this.canvas.style.height = "100%";

    this.engine = new Engine(this.canvas, true, {
      preserveDrawingBuffer: true,
      stencil: true,
    });
  }

  private initScene(): void {
    this.scene = new Scene(this.engine);
    this.scene.clearColor = new Color4(0.1, 0.11, 0.12, 1);

    const light = new HemisphericLight("h", new Vector3(0, 1, 0), this.scene);
    light.intensity = 0.85;

    // Initialize PlayerFactory after scene is created
    this.playerFactory = new PlayerFactory(this.scene);
  }

  private initMaterials(): void {
    this.matFloor = new StandardMaterial("floor", this.scene);
    const grassTexture = new Texture("assets/models/grass.png", this.scene);
    grassTexture.uScale = this.W; // Repeat texture across width
    grassTexture.vScale = this.H; // Repeat texture across height
    this.matFloor.diffuseTexture = grassTexture;

    this.matWall = new StandardMaterial("wall", this.scene);
    const wallTexture = new Texture("assets/models/wall.png", this.scene);
    this.matWall.diffuseTexture = wallTexture;

    this.matBox = new StandardMaterial("box", this.scene);
    this.matBox.diffuseColor = new Color3(0.63, 0.47, 0.35);

    this.matDoor = new StandardMaterial("door", this.scene);
    this.matDoor.diffuseColor = new Color3(0.32, 0.65, 0.95);

    this.matKey = new StandardMaterial("key", this.scene);
    this.matKey.emissiveColor = new Color3(1.0, 0.84, 0.0);

    this.matLava = new StandardMaterial("lava", this.scene);
    this.matLava.emissiveColor = new Color3(0.88, 0.24, 0.18);

    this.matExit = new StandardMaterial("exit", this.scene);
    this.matExit.emissiveColor = new Color3(0.35, 0.88, 0.42);

    this.matPlayer = new StandardMaterial("pm", this.scene);
    this.matPlayer.diffuseColor = new Color3(1.0, 0.2, 0.55);
  }

  private initGeometry(): void {
    // Ground
    const ground = MeshBuilder.CreateGround(
      "floor",
      { width: this.W * this.TILE, height: this.H * this.TILE, subdivisions: 2 },
      this.scene
    );
    ground.material = this.matFloor;
    ground.position = new Vector3(
      ((this.W - 1) * this.TILE) / 2,
      this.FLOOR_Y,
      ((this.H - 1) * this.TILE) / 2
    );

    // Create unit meshes for instancing
    this.wallUnit = MeshBuilder.CreateBox(
      "wallUnit",
      { width: this.TILE, depth: this.TILE, height: this.WALL_H },
      this.scene
    );
    this.wallUnit.material = this.matWall;
    this.wallUnit.isVisible = false;

    this.boxUnit = MeshBuilder.CreateBox(
      "boxUnit",
      { width: this.TILE * 0.98, depth: this.TILE * 0.98, height: this.TILE * 0.98 },
      this.scene
    );
    this.boxUnit.material = this.matBox;
    this.boxUnit.isVisible = false;

    this.doorUnit = MeshBuilder.CreateBox(
      "doorUnit",
      { width: this.TILE, depth: this.TILE * 0.2, height: this.WALL_H },
      this.scene
    );
    this.doorUnit.material = this.matDoor;
    this.doorUnit.isVisible = false;

    this.keyUnit = MeshBuilder.CreateTorus(
      "keyUnit",
      { diameter: this.TILE * 0.6, thickness: this.TILE * 0.12, tessellation: 24 },
      this.scene
    );
    this.keyUnit.material = this.matKey;
    this.keyUnit.isVisible = false;
  }

  private async initMap(): Promise<void> {
    let spawnFound = false;
    let exitFound = false;

    const keyPromises: Promise<void>[] = [];

    for (let j = 0; j < this.H; j++) {
      for (let i = 0; i < this.W; i++) {
        const ch = this.MAP[j][i];
        const p = this.cellToWorld(i, j);

        switch (ch) {
          case "#":
            this.createWall(i, j, p);
            break;
          case "B":
            this.createBox(i, j, p);
            break;
          case "D":
            this.createDoor(i, j, p);
            break;
          case "K":
            keyPromises.push(this.createKey(i, j, p));
            break;
          case "~":
            this.createLava(i, j, p);
            break;
          case "E":
            this.createExit(i, j, p);
            this.exitCell = { x: i, y: j };
            exitFound = true;
            break;
          case "S":
            this.spawnCell = { x: i, y: j };
            spawnFound = true;
            break;
        }
      }
    }

    // Wait for all keys to load
    await Promise.all(keyPromises);

    if (!spawnFound || !exitFound) {
      throw new Error("Map must include S (spawn) and E (exit).");
    }
  }

  private createWall(i: number, j: number, p: Vector3): void {
    const inst = this.wallUnit.createInstance(`w_${i}_${j}`);
    inst.position = p.add(new Vector3(0, this.WALL_H / 2, 0));
    this.blocked.add(this.keyOf(i, j));
  }

  private createBox(i: number, j: number, p: Vector3): void {
    const inst = this.boxUnit.createInstance(`b_${i}_${j}`);
    inst.position = p.add(new Vector3(0, this.TILE * 0.49, 0));
    this.boxes.set(this.keyOf(i, j), inst);
    this.blocked.add(this.keyOf(i, j));
  }

  private createDoor(i: number, j: number, p: Vector3): void {
    const inst = this.doorUnit.createInstance(`d_${i}_${j}`);
    inst.position = p.add(new Vector3(0, this.WALL_H / 2, 0));
    this.doors.set(this.keyOf(i, j), inst);
    this.blocked.add(this.keyOf(i, j));
  }

  private async createKey(i: number, j: number, p: Vector3): Promise<void> {
    // Load the external skeleton key model
    const keyGroup = await this.createExternalKey(i, j);
    keyGroup.position = p.add(new Vector3(0, this.TILE * 0.5, 0)); // Raise it higher to be more visible
    this.keys.set(this.keyOf(i, j), keyGroup);
  }

  private createRealisticKey(i: number, j: number): Mesh {
    const keyGroup = new Mesh(`keyGroup_${i}_${j}`, this.scene);

    // Choose a random color for this key
    const colorIndex = Math.floor(Math.random() * KEY_COLORS.length);
    const keyColor = KEY_COLORS[colorIndex];

    // Store the key color for this position
    this.keyColors.set(this.keyOf(i, j), keyColor.name);

    // Key head (circular part)
    const keyHead = MeshBuilder.CreateTorus(
      `keyHead_${i}_${j}`,
      { diameter: this.TILE * 0.4, thickness: this.TILE * 0.08, tessellation: 16 },
      this.scene
    );
    keyHead.position.y = 0;
    keyHead.parent = keyGroup;

    // Key shaft
    const keyShaft = MeshBuilder.CreateBox(
      `keyShaft_${i}_${j}`,
      { width: 0.05, height: this.TILE * 0.3, depth: 0.05 },
      this.scene
    );
    keyShaft.position = new Vector3(0, -this.TILE * 0.15, 0);
    keyShaft.parent = keyGroup;

    // Key teeth
    const tooth1 = MeshBuilder.CreateBox(
      `keyTooth1_${i}_${j}`,
      { width: 0.03, height: 0.08, depth: 0.08 },
      this.scene
    );
    tooth1.position = new Vector3(0.04, -this.TILE * 0.25, 0);
    tooth1.parent = keyGroup;

    const tooth2 = MeshBuilder.CreateBox(
      `keyTooth2_${i}_${j}`,
      { width: 0.03, height: 0.06, depth: 0.06 },
      this.scene
    );
    tooth2.position = new Vector3(0.04, -this.TILE * 0.2, 0);
    tooth2.parent = keyGroup;

    // Apply the chosen color material
    const keyMaterial = new StandardMaterial(`keyMat_${i}_${j}`, this.scene);
    keyMaterial.emissiveColor = keyColor.emissive;
    keyMaterial.diffuseColor = keyColor.diffuse;

    keyHead.material = keyMaterial;
    keyShaft.material = keyMaterial;
    tooth1.material = keyMaterial;
    tooth2.material = keyMaterial;

    return keyGroup;
  }

  private async createExternalKey(i: number, j: number): Promise<Mesh> {
    try {
      // Import the skeleton key GLB model
      const result = await ImportMeshAsync("assets/models/squid_key.glb", this.scene);

      if (!result.meshes || result.meshes.length === 0) {
        console.warn(`No meshes found in the path, falling back to procedural key`);
        return this.createRealisticKey(i, j);
      }

      // Create a parent mesh for the imported model
      const keyGroup = new Mesh(`externalKey_${i}_${j}`, this.scene);

      // Choose a random color for this key
      const colorIndex = Math.floor(Math.random() * KEY_COLORS.length);
      const keyColor = KEY_COLORS[colorIndex];

      // Store the key color for this position
      this.keyColors.set(this.keyOf(i, j), keyColor.name);
      

      // Parent all imported meshes to our key group and apply color tint
      console.log(result.meshes.slice(1).map(m => m.material));
      result.meshes.forEach((mesh: AbstractMesh, index: number) => {
        if (mesh.name !== "__root__") {
          mesh.parent = keyGroup;
          
          // Preserve original material but apply color tint
          if (mesh.material && mesh.material instanceof PBRMaterial) {
            const originalMaterial = mesh.material as PBRMaterial;
            
            // Create a copy of the original material to avoid affecting other instances
            const tintedMaterial = originalMaterial.clone(`tinted_${mesh.name}_${i}_${j}`);
            
            // Apply color tint to PBR material (use albedoColor instead of diffuseColor)
            if (tintedMaterial.albedoColor) {
              tintedMaterial.albedoColor = tintedMaterial.albedoColor.multiply(keyColor.diffuse);
            } else {
              tintedMaterial.albedoColor = keyColor.diffuse;
            }
            
            // Add subtle emissive glow
            if (tintedMaterial.emissiveColor) {
              tintedMaterial.emissiveColor = tintedMaterial.emissiveColor.add(keyColor.emissive);
            } else {
              tintedMaterial.emissiveColor = keyColor.emissive;
            }
            
            mesh.material = tintedMaterial;
            console.log('PBR tinted')
          } else if (mesh.material && mesh.material instanceof StandardMaterial) {
            const originalMaterial = mesh.material as StandardMaterial;
            
            // Create a copy of the original material to avoid affecting other instances
            const tintedMaterial = originalMaterial.clone(`tinted_${mesh.name}_${i}_${j}`);
            
            // Apply color tint by multiplying with the key color
            if (tintedMaterial.diffuseColor) {
              tintedMaterial.diffuseColor = tintedMaterial.diffuseColor.multiply(keyColor.diffuse);
            } else {
              tintedMaterial.diffuseColor = keyColor.diffuse;
            }
            
            // Add subtle emissive glow
            if (tintedMaterial.emissiveColor) {
              tintedMaterial.emissiveColor = tintedMaterial.emissiveColor.add(keyColor.emissive);
            } else {
              tintedMaterial.emissiveColor = keyColor.emissive;
            }
            
            mesh.material = tintedMaterial;
            console.log('Standard tinted')
          } else {
            // If no material or unknown type, create a new PBR material
            const newMaterial = new PBRMaterial(`keyMat_${mesh.name}_${i}_${j}`, this.scene);
            newMaterial.emissiveColor = keyColor.emissive;
            newMaterial.albedoColor = keyColor.diffuse;
            mesh.material = newMaterial;
            console.log('PBR replaced')
          }
        }
      });

      return keyGroup;

    } catch (error) {
      console.error(`Failed to load the path:`, error);
      console.log("Falling back to procedural key generation");
      return this.createRealisticKey(i, j);
    }
  }

  private createLava(i: number, j: number, p: Vector3): void {
    const lavaGroup = this.createRealisticLava(i, j);
    lavaGroup.position = p.add(new Vector3(0, 0.1, 0));
    this.lava.set(this.keyOf(i, j), lavaGroup);
  }

  private createRealisticLava(i: number, j: number): Mesh {
    // Create a simple plane for the lava
    const lavaPlane = MeshBuilder.CreatePlane(
      `lava_${i}_${j}`,
      { width: this.TILE * 0.95, height: this.TILE * 0.95 },
      this.scene
    );
    
    // Rotate to lie flat on the ground
    lavaPlane.rotation.x = Math.PI / 2;
    lavaPlane.position.y = 0.01; // Slightly above ground to avoid z-fighting

    // Create material with animated GIF texture
    const lavaMaterial = new StandardMaterial(`lavaMat_${i}_${j}`, this.scene);
    const lavaTexture = new Texture("assets/models/lava.gif", this.scene);
    
    lavaMaterial.diffuseTexture = lavaTexture;
    lavaMaterial.emissiveTexture = lavaTexture; // Make it glow
    lavaMaterial.emissiveColor = new Color3(0.3, 0.1, 0.05); // Subtle glow tint
    
    lavaPlane.material = lavaMaterial;

    // Initialize GIF animation with material reference
    this.initGifAnimation(lavaMaterial, "assets/models/lava.gif");

    return lavaPlane;
  }

  private async initGifAnimation(material: StandardMaterial, gifUrl: string): Promise<void> {
    try {
      // Check if ImageDecoder is supported
      if (typeof (window as any).ImageDecoder === 'undefined') {
        console.warn('ImageDecoder not supported, GIF will be static');
        return;
      }

      const response = await fetch(gifUrl);
      const imageDecoder = new (window as any).ImageDecoder({ data: response.body, type: 'image/gif' });
      
      await imageDecoder.tracks.ready;
      await imageDecoder.completed;

      console.log(imageDecoder, `GIF has ${imageDecoder.tracks[0].frameCount} frames`);

      const maxFrame = imageDecoder.tracks[0].frameCount;
      
      if (maxFrame <= 1) {
        console.log('GIF has only one frame, will be static');
        return;
      }

      // Create a single dynamic texture that we'll reuse
      const firstResult = await imageDecoder.decode({ frameIndex: 0 });
      const canvas = document.createElement('canvas');
      canvas.width = firstResult.image.displayWidth;
      canvas.height = firstResult.image.displayHeight;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        console.error('Could not get canvas context');
        return;
      }
      
      // Create the dynamic texture once
      const dynamicTexture = new DynamicTexture(`lavaAnimated`, {width: canvas.width, height: canvas.height}, this.scene, false);
      const dynamicCtx = dynamicTexture.getContext();
      
      // Set up the material with the dynamic texture
      material.diffuseTexture = dynamicTexture;
      material.emissiveTexture = dynamicTexture;
      
      let imageIndex = 0;
      const render = async () => {
        try {
          const result = await imageDecoder.decode({ frameIndex: imageIndex });
          
          // Draw frame to our canvas
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(result.image, 0, 0);
          
          // Copy canvas to dynamic texture
          dynamicCtx.clearRect(0, 0, canvas.width, canvas.height);
          dynamicCtx.drawImage(canvas, 0, 0);
          dynamicTexture.update();
          
          imageIndex++;
          if (imageIndex >= maxFrame) {
            imageIndex = 0;
          }
          
          // Use the frame duration from the GIF, with a minimum of 100ms
          const duration = Math.max(result.image.duration / 1000.0, 100);
          setTimeout(render, duration / 5);
        } catch (error) {
          console.error('Error decoding GIF frame:', error);
        }
      };
      
      await render();
      
    } catch (error) {
      console.error('Failed to initialize GIF animation:', error);
    }
  }

  private createExit(i: number, j: number, p: Vector3): void {
    const exitGroup = this.createRealisticExit(i, j);
    exitGroup.position = p.add(new Vector3(0, 0.1, 0));
  }

  private createRealisticExit(i: number, j: number): Mesh {
    const exitGroup = new Mesh(`exitGroup_${i}_${j}`, this.scene);

    // Main exit platform
    const exitPlatform = MeshBuilder.CreateBox(
      `exitPlatform_${i}_${j}`,
      { width: this.TILE * 0.9, depth: this.TILE * 0.9, height: 0.1 },
      this.scene
    );
    exitPlatform.position.y = 0;
    exitPlatform.parent = exitGroup;

    // Glowing border
    const exitBorder = MeshBuilder.CreateTorus(
      `exitBorder_${i}_${j}`,
      { diameter: this.TILE * 0.85, thickness: 0.05, tessellation: 32 },
      this.scene
    );
    exitBorder.position.y = 0.08;
    exitBorder.parent = exitGroup;

    // Central glowing orb
    const exitOrb = MeshBuilder.CreateSphere(
      `exitOrb_${i}_${j}`,
      { diameter: 0.4 },
      this.scene
    );
    exitOrb.position.y = 0.25;
    exitOrb.parent = exitGroup;

    // Floating rings around the orb
    const ring1 = MeshBuilder.CreateTorus(
      `exitRing1_${i}_${j}`,
      { diameter: 0.6, thickness: 0.02, tessellation: 24 },
      this.scene
    );
    ring1.position.y = 0.25;
    ring1.parent = exitGroup;

    const ring2 = MeshBuilder.CreateTorus(
      `exitRing2_${i}_${j}`,
      { diameter: 0.8, thickness: 0.015, tessellation: 24 },
      this.scene
    );
    ring2.position.y = 0.25;
    ring2.parent = exitGroup;

    // Materials
    const exitMaterial = new StandardMaterial(`exitMat_${i}_${j}`, this.scene);
    exitMaterial.diffuseColor = new Color3(0.2, 0.8, 0.3); // Green
    exitMaterial.emissiveColor = new Color3(0.3, 0.9, 0.4); // Glowing green

    const orbMaterial = new StandardMaterial(`exitOrbMat_${i}_${j}`, this.scene);
    orbMaterial.diffuseColor = new Color3(0.4, 1.0, 0.5); // Bright green
    orbMaterial.emissiveColor = new Color3(0.6, 1.0, 0.7); // Very bright glow

    const ringMaterial = new StandardMaterial(`exitRingMat_${i}_${j}`, this.scene);
    ringMaterial.diffuseColor = new Color3(0.8, 1.0, 0.8); // Light green
    ringMaterial.emissiveColor = new Color3(0.5, 1.0, 0.6); // Bright glow
    ringMaterial.alpha = 0.7; // Semi-transparent

    exitPlatform.material = exitMaterial;
    exitBorder.material = exitMaterial;
    exitOrb.material = orbMaterial;
    ring1.material = ringMaterial;
    ring2.material = ringMaterial;

    // Animation
    this.scene.onBeforeRenderObservable.add(() => {
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

  private async initPlayer(): Promise<void> {
    // Create a more realistic player character with directional features
    const playerMesh = await this.playerFactory.createRealisticPlayer();

    this.player = {
      x: this.spawnCell.x,
      y: this.spawnCell.y,
      keys: 0,
      keysByColor: new Map<string, number>(),
      mesh: playerMesh,
      moving: false,
      rotation: 0 // Start facing right (0 radians)
    };

    this.placePlayer(this.player.x, this.player.y);
  }

  private initCamera(): void {
    // Create ArcRotateCamera for better mouse control
    this.camera = new ArcRotateCamera(
      "cam",
      -Math.PI / 2, // Alpha (horizontal rotation)
      Math.PI / 3,  // Beta (vertical rotation)
      15,           // Radius (distance from target)
      Vector3.Zero(), // Initial target
      this.scene
    );

    // Enable mouse controls for camera rotation
    this.camera.attachControl(this.canvas, true);

    // Configure mouse rotation sensitivity (lower = more sensitive)
    this.camera.angularSensibilityX = 1000; // Horizontal rotation sensitivity
    this.camera.angularSensibilityY = 1000; // Vertical rotation sensitivity

    // Configure wheel zoom sensitivity
    this.camera.wheelPrecision = 20;

    // Set rotation limits to prevent camera from going too high or low
    this.camera.lowerBetaLimit = 0.1; // Minimum vertical angle (prevent going below ground)
    this.camera.upperBetaLimit = Math.PI / 2.2; // Maximum vertical angle (prevent going too high)

    // Set distance limits
    this.camera.lowerRadiusLimit = 5;  // Minimum zoom distance
    this.camera.upperRadiusLimit = 30; // Maximum zoom distance

    // Set the target to follow the player
    if (this.player && this.player.mesh) {
      this.camera.setTarget(this.player.mesh.position);
    }
  }

  private initInput(): void {
    window.addEventListener("keydown", (e) => this.handleKeyDown(e));

    // Animate keys (floating and rotating)
    this.scene.onBeforeRenderObservable.add(() => {
      const t = performance.now() * 0.001;
      for (const keyGroup of this.keys.values()) {
        // Rotate the entire key group (works for both external models and procedural keys)
        keyGroup.rotation.y = t * 2;

        // Add floating motion
        const baseY = this.TILE * 0.5;
        const float = Math.sin(t * 3) * 0.1;
        keyGroup.position.y = baseY + float;

        // Additional rotation around other axes for more dynamic movement
        keyGroup.rotation.x = Math.sin(t * 1.5) * 0.2;
        keyGroup.rotation.z = Math.cos(t * 1.8) * 0.15;
      }
    });
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (this.player.moving) return;

    const key = e.key.toLowerCase();

    if (this.player.mesh.isDisposed() || key === "r") {
      this.resetGame().catch(error => {
        console.error("Failed to reset game:", error);
        this.showBanner("Reset failed - please refresh the page");
      });
      return;
    }

    switch (key) {
      case "arrowleft":
      case "q":
        // Rotate left
        this.rotatePlayer(Math.PI / 2);
        break;
      case "arrowright":
      case "d":
        // Rotate right
        this.rotatePlayer(-Math.PI / 2);
        break;
      case "arrowup":
      case "z":
        // Move forward in the direction the player is facing
        this.movePlayerForward();
        break;
      // Remove down/backward movement
      default:
        return;
    }
  }

  private rotatePlayer(deltaRotation: number): void {
    this.player.rotation += deltaRotation;
    // Normalize rotation to 0-2π range
    this.player.rotation = ((this.player.rotation % (2 * Math.PI)) + (2 * Math.PI)) % (2 * Math.PI);

    // Apply rotation to the mesh
    this.player.mesh.rotation.y = -this.player.rotation;
  }

  private movePlayerForward(): void {
    // Calculate the direction vector based on player rotation
    const dx = Math.cos(this.player.rotation);
    const dy = Math.sin(this.player.rotation);

    // Round to get grid-aligned movement
    const gridDx = Math.round(dx);
    const gridDy = Math.round(dy);

    this.attemptMove(gridDx, gridDy);
  }

  private attemptMove(dx: number, dy: number): void {
    const nx = this.player.x + dx;
    const ny = this.player.y + dy;

    if (!this.inBounds(nx, ny)) return;

    const targetKey = this.keyOf(nx, ny);

    // Handle door interaction
    if (this.doors.has(targetKey)) {
      if (this.player.keys > 0) {
        this.player.keys--;
        this.updateHUD();
        this.doors.get(targetKey)!.dispose();
        this.doors.delete(targetKey);
        this.blocked.delete(targetKey);
      } else {
        return; // Can't open door without key
      }
    }

    // Handle box pushing
    if (this.boxes.has(targetKey)) {
      const bx = nx + dx;
      const by = ny + dy;
      const boxTargetKey = this.keyOf(bx, by);

      if (!this.inBounds(bx, by) || this.isBlocked(bx, by)) {
        return; // Can't push box
      }

      // Remove lava if box is pushed into it
      const box = this.boxes.get(targetKey)!;
      if (this.lava.has(boxTargetKey)) {
        this.lava.get(boxTargetKey)!.dispose();
        this.lava.delete(boxTargetKey);
        this.boxes.delete(targetKey);
        this.blocked.delete(targetKey);
        box.dispose();
      } else {
        this.boxes.delete(targetKey);
        this.blocked.delete(targetKey);
        this.boxes.set(boxTargetKey, box);
        this.blocked.add(boxTargetKey);
      }


      this.tweenPosition(
        box,
        this.cellToWorld(bx, by, this.TILE * 0.49),
        this.PUSH_MS
      );
    }

    // Final check: if still blocked, can't move
    if (this.isBlocked(nx, ny)) return;

    // Move player
    this.movePlayer(nx, ny);
  }

  private movePlayer(nx: number, ny: number): void {
    this.player.moving = true;

    // Store initial positions for camera following
    const initialCameraPosition = this.camera.position.clone();
    const initialCameraTarget = this.camera.getTarget();
    const initialPlayerPosition = this.player.mesh.position.clone();
    const targetPlayerPosition = this.cellToWorld(nx, ny, this.TILE * 0.5);
    const movementDelta = targetPlayerPosition.subtract(initialPlayerPosition);

    this.tweenPlayerAndCamera(
      targetPlayerPosition,
      this.MOVE_MS,
      initialCameraPosition,
      initialCameraTarget,
      movementDelta,
      () => {
        this.player.x = nx;
        this.player.y = ny;
        this.player.moving = false;
        this.handlePlayerLanded();
      }
    );
  }

  private tweenPlayerAndCamera(
    targetPos: Vector3,
    durationMs: number,
    initialCameraPosition: Vector3,
    initialCameraTarget: Vector3,
    movementDelta: Vector3,
    onComplete?: () => void
  ): void {
    const startPos = this.player.mesh.position.clone();
    const startTime = performance.now();

    const observer = this.scene.onBeforeRenderObservable.add(() => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / durationMs, 1);

      // Smooth easing
      const easedProgress = 0.5 - 0.5 * Math.cos(Math.PI * progress);

      // Update player position
      this.player.mesh.position = Vector3.Lerp(startPos, targetPos, easedProgress);

      // Update camera position and target to follow
      const cameraOffset = movementDelta.scale(easedProgress);
      this.camera.position = initialCameraPosition.add(cameraOffset);
      this.camera.setTarget(initialCameraTarget.add(cameraOffset));

      if (progress >= 1) {
        this.scene.onBeforeRenderObservable.remove(observer);
        if (onComplete) onComplete();
      }
    });
  }

  private handlePlayerLanded(): void {
    const playerKey = this.keyOf(this.player.x, this.player.y);

    // Key pickup
    if (this.keys.has(playerKey)) {
      // Get the key color before disposing
      const keyColor = this.keyColors.get(playerKey);
      if (keyColor) {
        // Update color-specific count
        const currentCount = this.player.keysByColor.get(keyColor) || 0;
        this.player.keysByColor.set(keyColor, currentCount + 1);
      }

      this.keys.get(playerKey)!.dispose();
      this.keys.delete(playerKey);
      this.keyColors.delete(playerKey);
      this.player.keys++;
      this.updateHUD();
    }

    // Lava check
    if (this.lava.has(playerKey)) {
      this.showBanner("You fell in lava. Press R to respawn.");
      this.player.mesh.dispose();
      return;
    }

    // Exit check
    if (this.player.x === this.exitCell.x && this.player.y === this.exitCell.y) {
      this.triggerWinAnimation();
      return;
    }

    this.showBanner("");
  }

  private triggerWinAnimation(): void {
    this.player.moving = true; // Prevent further movement during animation

    // Find the exit group to enhance its glow
    const exitKey = this.keyOf(this.exitCell.x, this.exitCell.y);
    const exitGroup = this.scene.getMeshByName(`exitGroup_${this.exitCell.x}_${this.exitCell.y}`);

    // Enhance exit glow animation
    if (exitGroup) {
      this.enhanceExitGlow(exitGroup);
    }

    // Animate player rotating upward
    this.animatePlayerWin();

    // Show win message after a delay
    setTimeout(() => {
      this.showBanner("🎉 You win! Press R to play again. 🎉");
    }, 1000);
  }

  private enhanceExitGlow(exitGroup: AbstractMesh): void {
    const orbMesh = exitGroup.getChildMeshes().find(mesh => mesh.name.includes('exitOrb'));
    const platformMesh = exitGroup.getChildMeshes().find(mesh => mesh.name.includes('exitPlatform'));

    if (orbMesh && orbMesh.material) {
      const orbMaterial = orbMesh.material as StandardMaterial;
      const originalEmissive = orbMaterial.emissiveColor.clone();

      // Create intense glow animation
      const startTime = performance.now();
      const glowObserver = this.scene.onBeforeRenderObservable.add(() => {
        const elapsed = (performance.now() - startTime) * 0.001;
        const intensity = 2 + Math.sin(elapsed * 8) * 0.5; // Fast pulsing

        orbMaterial.emissiveColor = new Color3(
          originalEmissive.r * intensity,
          originalEmissive.g * intensity,
          originalEmissive.b * intensity
        );

        // Stop after 3 seconds
        if (elapsed > 3) {
          this.scene.onBeforeRenderObservable.remove(glowObserver);
          orbMaterial.emissiveColor = originalEmissive;
        }
      });
    }
  }

  private animatePlayerWin(): void {
    const startTime = performance.now();
    const duration = 1000; // 2 seconds
    const startRotation = this.player.mesh.rotation.clone();

    // Target rotation: rotate upward (around X axis)
    const targetRotation = new Vector3(
      startRotation.x, // Rotate 90 degrees upward
      startRotation.y,
      startRotation.z - Math.PI / 2
    );

    // Also lift the player up slightly
    const startPosition = this.player.mesh.position.clone();
    const targetPosition = startPosition.add(new Vector3(0, 1.5, 0));

    const winObserver = this.scene.onBeforeRenderObservable.add(() => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Smooth easing for the rotation
      const easedProgress = 0.5 - 0.5 * Math.cos(Math.PI * progress);

      // Interpolate rotation
      this.player.mesh.rotation = Vector3.Lerp(startRotation, targetRotation, easedProgress);

      // Interpolate position (slight upward movement)
      this.player.mesh.position = Vector3.Lerp(startPosition, targetPosition, easedProgress);

      // Add a gentle spinning effect around Y axis for extra flair
      this.player.mesh.rotation.y = startRotation.y + easedProgress * Math.PI * 2;

      if (progress >= 1) {
        this.scene.onBeforeRenderObservable.remove(winObserver);
      }
    });
  }

  private async resetGame(): Promise<void> {
    // Reset player position
    this.player.x = this.spawnCell.x;
    this.player.y = this.spawnCell.y;
    this.player.keys = 0;
    this.player.moving = false;

    // Recreate player mesh if disposed
    if (this.player.mesh.isDisposed()) {
      const playerMesh = await this.playerFactory.createRealisticPlayer();
      this.player.mesh = playerMesh;
      this.camera.setTarget(playerMesh.position); // Update camera target
    }

    this.placePlayer(this.player.x, this.player.y);
    this.showBanner("");
    this.updateHUD();
  }

  private placePlayer(x: number, y: number): void {
    // Get the old player position before moving
    const oldPosition = this.player.mesh.position.clone();

    // Move the player to new position
    const newPosition = this.cellToWorld(x, y, this.TILE * 0.5);
    this.player.mesh.position = newPosition;

    // Calculate the movement delta
    const deltaPosition = newPosition.subtract(oldPosition);

    // Translate the camera by the same amount to follow the player
    if (this.camera) {
      // Get current camera target and position
      const currentTarget = this.camera.getTarget();
      const currentPosition = this.camera.position.clone();

      // Move both target and camera position by the same delta
      this.camera.setTarget(currentTarget.add(deltaPosition));
      this.camera.position = currentPosition.add(deltaPosition);
    }
  }

  private tweenPosition(
    mesh: AbstractMesh,
    targetPos: Vector3,
    durationMs: number,
    onComplete?: () => void
  ): void {
    const startPos = mesh.position.clone();
    const startTime = performance.now();

    const observer = this.scene.onBeforeRenderObservable.add(() => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / durationMs, 1);

      // Smooth easing
      const easedProgress = 0.5 - 0.5 * Math.cos(Math.PI * progress);

      mesh.position = Vector3.Lerp(startPos, targetPos, easedProgress);

      // Special handling for player movement
      if (mesh === this.player.mesh) {
        // Face the movement direction
        const moveDirection = targetPos.subtract(startPos);
        if (moveDirection.length() > 0.001) {
          const targetRotationY = Math.atan2(moveDirection.x, moveDirection.z);
          mesh.rotation.z = targetRotationY + Math.PI / 2; // Adjust for model orientation
        }

        // Add walking bob animation
        const bob = this.player.moving ? 0.05 * Math.sin(12 * Math.PI * easedProgress) : 0;
        mesh.position.y = this.TILE * 0.5 + bob;

        // Add slight walking sway
        if (this.player.moving) {
          const sway = 0.02 * Math.sin(8 * Math.PI * easedProgress);
          mesh.rotation.x = sway - Math.PI / 2;
        } else {
          mesh.rotation.x = -Math.PI / 2;
        }
      }

      if (progress >= 1) {
        if (observer) {
          this.scene.onBeforeRenderObservable.remove(observer);
        }
        onComplete?.();
      }
    });
  }

  // Utility methods
  private cellToWorld(i: number, j: number, y: number = 0): Vector3 {
    return new Vector3(i * this.TILE, y, j * this.TILE);
  }

  private keyOf(i: number, j: number): string {
    return `${i},${j}`;
  }

  private inBounds(i: number, j: number): boolean {
    return i >= 0 && j >= 0 && i < this.W && j < this.H;
  }

  private isBlocked(i: number, j: number): boolean {
    return this.blocked.has(this.keyOf(i, j));
  }

  private updateHUD(): void {
    const keysContainer = document.getElementById("keys-container");
    if (!keysContainer) return;

    // Clear existing keys
    keysContainer.innerHTML = "";

    // If no keys, show empty state
    if (this.player.keys === 0) {
      keysContainer.innerHTML = '<div style="color: #666; font-style: italic; font-size: 12px;">No keys collected</div>';
      return;
    }

    // Create visual elements for each key color
    for (const [colorName, count] of this.player.keysByColor.entries()) {
      if (count > 0) {
        const keyColor = KEY_COLORS.find(c => c.name === colorName);
        if (keyColor) {
          const keyItem = document.createElement("div");
          keyItem.className = "key-item";
          keyItem.style.borderColor = `rgb(${Math.floor(keyColor.emissive.r * 255)}, ${Math.floor(keyColor.emissive.g * 255)}, ${Math.floor(keyColor.emissive.b * 255)})`;

          const colorDot = document.createElement("div");
          colorDot.className = "key-color";
          colorDot.style.backgroundColor = `rgb(${Math.floor(keyColor.emissive.r * 255)}, ${Math.floor(keyColor.emissive.g * 255)}, ${Math.floor(keyColor.emissive.b * 255)})`;
          colorDot.style.color = `rgb(${Math.floor(keyColor.emissive.r * 255)}, ${Math.floor(keyColor.emissive.g * 255)}, ${Math.floor(keyColor.emissive.b * 255)})`;

          keyItem.appendChild(colorDot);

          // Only show count if there are multiple keys of the same color
          if (count > 1) {
            const countSpan = document.createElement("span");
            countSpan.className = "key-count";
            countSpan.textContent = count.toString();
            keyItem.appendChild(countSpan);
          }

          keysContainer.appendChild(keyItem);
        }
      }
    }
  }

  private showBanner(message: string): void {
    this.bannerElement.textContent = message;
  }

  private start(): void {
    this.engine.runRenderLoop(() => this.scene.render());
    window.addEventListener("resize", () => this.engine.resize());
    this.updateHUD();
  }
}

// Initialize the game when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new GridPuzzle3D();
});
