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

// Types
interface Position {
  x: number;
  y: number;
}

interface Player {
  x: number;
  y: number;
  keys: number;
  mesh: Mesh;
  moving: boolean;
}

class GridPuzzle3D {
  private readonly MAP = [
    "####################",
    "#S....#...........E#",
    "#.##.#.#####.#######",
    "#....#.....#.......#",
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
  private spawnCell!: Position;
  private exitCell!: Position;
  
  // Collections
  private blocked = new Set<string>();
  private doors = new Map<string, AbstractMesh>();
  private boxes = new Map<string, AbstractMesh>();
  private keys = new Map<string, AbstractMesh>();
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
    this.initPlayer();
    this.initCamera();
    this.initInput();
    this.start();
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
    const inst = this.keyUnit.createInstance(`k_${i}_${j}`);
    inst.position = p.add(new Vector3(0, this.TILE * 0.35, 0));
    this.keys.set(this.keyOf(i, j), inst);
  }

  private createLava(i: number, j: number, p: Vector3): void {
    const plate = MeshBuilder.CreateBox(
      `lava_${i}_${j}`,
      { width: this.TILE, depth: this.TILE, height: 0.06 },
      this.scene
    );
    plate.material = this.matLava;
    plate.position = p.add(new Vector3(0, 0.03, 0));
    this.lava.set(this.keyOf(i, j), plate);
  }

  private createExit(i: number, j: number, p: Vector3): void {
    const plate = MeshBuilder.CreateBox(
      `exit_${i}_${j}`,
      { width: this.TILE, depth: this.TILE, height: 0.06 },
      this.scene
    );
    plate.material = this.matExit;
    plate.position = p.add(new Vector3(0, 0.03, 0));
  }

  private initPlayer(): void {
    // Create a more realistic player character with directional features
    const playerMesh = this.createRealisticPlayer();
    
    this.player = {
      x: this.spawnCell.x,
      y: this.spawnCell.y,
      keys: 0,
      mesh: playerMesh,
      moving: false
    };

    this.placePlayer(this.player.x, this.player.y);
  }

  private createRealisticPlayer(): Mesh {
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

    // Animate keys
    this.scene.onBeforeRenderObservable.add(() => {
      const t = performance.now() * 0.001;
      for (const mesh of this.keys.values()) {
        mesh.rotation.y = t;
      }
    });
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (this.player.moving) return;

    const key = e.key.toLowerCase();
    let dx = 0, dy = 0;

    if (this.player.mesh.isDisposed() || key === "r") {
      this.resetGame();
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
      if (this.lava.has(boxTargetKey)) {
        this.lava.get(boxTargetKey)!.dispose();
        this.lava.delete(boxTargetKey);
      }

      // Move box
      const box = this.boxes.get(targetKey)!;
      this.boxes.delete(targetKey);
      this.blocked.delete(targetKey);
      this.boxes.set(boxTargetKey, box);
      this.blocked.add(boxTargetKey);

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
      this.keys.get(playerKey)!.dispose();
      this.keys.delete(playerKey);
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

  private resetGame(): void {
    // Reset player position
    this.player.x = this.spawnCell.x;
    this.player.y = this.spawnCell.y;
    this.player.keys = 0;
    this.player.moving = false;

    // Recreate player mesh if disposed
    if (this.player.mesh.isDisposed()) {
      const playerMesh = this.createRealisticPlayer();
      this.player.mesh = playerMesh;
      
      // Update camera to follow the new player mesh by updating target
      // ArcFollowCamera should automatically follow the new mesh
      (this.camera as any).target = playerMesh;
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
    this.hudElement.textContent = `Keys: ${this.player.keys}`;
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
