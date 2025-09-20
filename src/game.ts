import {
  Engine,
  Scene,
  Vector3,
  Color4,
  Color3,
  HemisphericLight,
  ArcFollowCamera,
  MeshBuilder,
  Mesh,
  StandardMaterial,
  AbstractMesh,
  Observer
} from '@babylonjs/core';
import { GridMaterial } from '@babylonjs/materials';
import { Player, PlayerFactory } from './Player';

// Types
interface Position {
  x: number;
  y: number;
}

// Define key colors
const KEY_COLORS = [
  { name: 'gold', emissive: new Color3(1.0, 0.84, 0.0), diffuse: new Color3(0.8, 0.7, 0.2) },
  { name: 'silver', emissive: new Color3(0.9, 0.9, 1.0), diffuse: new Color3(0.6, 0.6, 0.7) },
  { name: 'copper', emissive: new Color3(1.0, 0.5, 0.2), diffuse: new Color3(0.7, 0.4, 0.2) },
  { name: 'emerald', emissive: new Color3(0.2, 1.0, 0.4), diffuse: new Color3(0.1, 0.6, 0.2) },
  { name: 'ruby', emissive: new Color3(1.0, 0.2, 0.3), diffuse: new Color3(0.7, 0.1, 0.2) },
  { name: 'sapphire', emissive: new Color3(0.2, 0.4, 1.0), diffuse: new Color3(0.1, 0.2, 0.7) }
];

class GridPuzzle3D {
  private readonly MAP = [
    "####################",
    "#S....#...........E#",
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
  private camera!: ArcFollowCamera;
  
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
  private matFloor!: GridMaterial;
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
    this.initMap();
    // Player, camera, and input initialization are now async
    this.initializeAsync();
  }

  private async initializeAsync(): Promise<void> {
    try {
      await this.initPlayer();
      this.initCamera();
      this.initInput();
      this.start();
      this.showBanner("Player loaded! Use arrow keys or WASD to move.");
    } catch (error) {
      console.error("Failed to initialize player:", error);
      this.showBanner("Player loading failed, using fallback.");
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
    this.matFloor = new GridMaterial("grid", this.scene);
    this.matFloor.majorUnitFrequency = 1;
    this.matFloor.minorUnitVisibility = 0;
    this.matFloor.gridRatio = this.TILE;
    this.matFloor.mainColor = new Color3(0.3, 0.33, 0.38);
    this.matFloor.lineColor = new Color3(0.18, 0.2, 0.24);

    this.matWall = new StandardMaterial("wall", this.scene);
    this.matWall.diffuseColor = new Color3(0.32, 0.34, 0.4);

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

  private initMap(): void {
    let spawnFound = false;
    let exitFound = false;

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
            this.createKey(i, j, p);
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

  private createKey(i: number, j: number, p: Vector3): void {
    // Create a more realistic key instead of a simple torus
    const keyGroup = this.createRealisticKey(i, j);
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

  private createLava(i: number, j: number, p: Vector3): void {
    const lavaGroup = this.createRealisticLava(i, j);
    lavaGroup.position = p.add(new Vector3(0, 0.1, 0));
    this.lava.set(this.keyOf(i, j), lavaGroup);
  }

  private createRealisticLava(i: number, j: number): Mesh {
    const lavaGroup = new Mesh(`lavaGroup_${i}_${j}`, this.scene);
    
    // Main lava pool (slightly depressed)
    const lavaPool = MeshBuilder.CreateBox(
      `lavaPool_${i}_${j}`,
      { width: this.TILE * 0.95, depth: this.TILE * 0.95, height: 0.15 },
      this.scene
    );
    lavaPool.position.y = -0.05;
    lavaPool.parent = lavaGroup;
    
    // Create multiple bubbling spheres for realistic effect
    const bubbleCount = 5;
    const bubbles: Mesh[] = [];
    
    for (let b = 0; b < bubbleCount; b++) {
      const bubble = MeshBuilder.CreateSphere(
        `lavaBubble_${i}_${j}_${b}`,
        { diameter: 0.1 + Math.random() * 0.2 },
        this.scene
      );
      
      // Random position within the lava pool
      bubble.position = new Vector3(
        (Math.random() - 0.5) * this.TILE * 0.8,
        Math.random() * 0.05,
        (Math.random() - 0.5) * this.TILE * 0.8
      );
      bubble.parent = lavaGroup;
      bubbles.push(bubble);
    }
    
    // Enhanced lava material with animation
    const lavaMaterial = new StandardMaterial(`lavaPoolMat_${i}_${j}`, this.scene);
    lavaMaterial.diffuseColor = new Color3(0.9, 0.2, 0.1); // Bright red-orange
    lavaMaterial.emissiveColor = new Color3(1.0, 0.4, 0.1); // Glowing effect
    lavaMaterial.specularColor = new Color3(1.0, 0.6, 0.2); // Shiny surface
    
    // Bubble material - more yellow-orange for heat
    const bubbleMaterial = new StandardMaterial(`lavaBubbleMat_${i}_${j}`, this.scene);
    bubbleMaterial.diffuseColor = new Color3(1.0, 0.5, 0.1); // Hot orange
    bubbleMaterial.emissiveColor = new Color3(1.0, 0.6, 0.2); // Very glowing
    
    lavaPool.material = lavaMaterial;
    bubbles.forEach(bubble => bubble.material = bubbleMaterial);
    
    // Add bubbling animation
    this.scene.onBeforeRenderObservable.add(() => {
      const time = performance.now() * 0.001;
      
      // Animate bubbles - make them bob up and down at different rates
      bubbles.forEach((bubble, index) => {
        const speed = 1.5 + index * 0.3;
        const amplitude = 0.03 + index * 0.01;
        bubble.position.y = Math.abs(Math.sin(time * speed)) * amplitude;
        
        // Slight horizontal movement for more realism
        const originalX = (Math.random() - 0.5) * this.TILE * 0.8;
        const originalZ = (Math.random() - 0.5) * this.TILE * 0.8;
        bubble.position.x = originalX + Math.sin(time * speed * 0.5) * 0.02;
        bubble.position.z = originalZ + Math.cos(time * speed * 0.7) * 0.02;
        
        // Scale bubbles to simulate popping and reforming
        const scale = 0.8 + 0.4 * Math.abs(Math.sin(time * speed * 1.5));
        bubble.scaling = new Vector3(scale, scale, scale);
      });
      
      // Make the main pool glow pulse
      const glowIntensity = 0.8 + 0.3 * Math.sin(time * 2);
      lavaMaterial.emissiveColor = new Color3(
        1.0 * glowIntensity,
        0.4 * glowIntensity,
        0.1 * glowIntensity
      );
    });
    
    return lavaGroup;
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
      moving: false
    };

    this.placePlayer(this.player.x, this.player.y);
  }

  private initCamera(): void {
    this.camera = new ArcFollowCamera(
      "cam",
      -Math.PI / 2,
      1.05,
      26,
      this.player.mesh,
      this.scene
    );
    this.camera.attachControl(this.canvas, true);
    // Note: wheelPrecision might not be available in all versions
    (this.camera as any).wheelPrecision = 40;
  }

  private initInput(): void {
    window.addEventListener("keydown", (e) => this.handleKeyDown(e));

    // Animate keys (floating and rotating)
    this.scene.onBeforeRenderObservable.add(() => {
      const t = performance.now() * 0.001;
      for (const keyGroup of this.keys.values()) {
        // Rotate the key
        keyGroup.rotation.y = t * 2;
        // Add floating motion
        const baseY = this.TILE * 0.5;
        const float = Math.sin(t * 3) * 0.1;
        keyGroup.position.y = baseY + float;
      }
    });
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (this.player.moving) return;

    const key = e.key.toLowerCase();
    let dx = 0, dy = 0;

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
        dx = -1;
        break;
      case "arrowright":
      case "d":
        dx = 1;
        break;
      case "arrowup":
      case "z":
        dy = 1;
        break;
      case "arrowdown":
      case "s":
        dy = -1;
        break;
      default:
        return;
    }

    this.attemptMove(dx, dy);
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

    this.tweenPosition(
      this.player.mesh,
      this.cellToWorld(nx, ny, this.TILE * 0.5),
      this.MOVE_MS,
      () => {
        this.player.x = nx;
        this.player.y = ny;
        this.player.moving = false;
        // ArcFollowCamera automatically follows the target mesh, no need to set target

        this.handlePlayerLanded();
      }
    );
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
      this.showBanner("You win! Press R to play again.");
      return;
    }

    this.showBanner("");
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
      this.camera.setMeshTarget(playerMesh); // Update camera target
    }

    this.placePlayer(this.player.x, this.player.y);
    this.showBanner("");
    this.updateHUD();
  }

  private placePlayer(x: number, y: number): void {
    this.player.mesh.position = this.cellToWorld(x, y, this.TILE * 0.5);
    // For ArcFollowCamera, we don't need to manually set target as it follows the mesh
    // The camera automatically follows the target mesh passed in constructor
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
          mesh.rotation.y = targetRotationY;
        }
        
        // Add walking bob animation
        const bob = this.player.moving ? 0.05 * Math.sin(12 * Math.PI * easedProgress) : 0;
        mesh.position.y = this.TILE * 0.5 + bob;
        
        // Add slight walking sway
        if (this.player.moving) {
          const sway = 0.02 * Math.sin(8 * Math.PI * easedProgress);
          mesh.rotation.z = sway;
        } else {
          mesh.rotation.z = 0;
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
