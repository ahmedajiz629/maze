import {
  AbstractMesh,
  AnimationGroup,
  ArcRotateCamera,
  Color3,
  Engine,
  Mesh,
  Scene,
  StandardMaterial,
  Vector3
} from '@babylonjs/core';
import '@babylonjs/loaders'; // This adds the loaders to the scene
import * as parts from './parts';
import { CONFIG } from './config';

// Types
interface Position {
  x: number;
  y: number;
}

interface Player {
  x: number;
  y: number;
  keys: number;
  mesh: AbstractMesh;
  moving: boolean;
  rotation: number; // Player's facing direction in radians
  animationGroups?: AnimationGroup[]; // Store animations if available
}

class GridPuzzle3D {
  private readonly MAP = [
    "...#################",
    ".StyB.#........a..E#",
    "#~##.#.#####A#######",
    "#~...#.....#.......#",
    "###.###.#.#.###.#..#",
    "#..B....#.#...#.#..#",
    "#D#~#####.#.#.#.#..#",
    "#...d.....#.#.#....#",
    "#####.#####.#.####.#",
    "#..T..#.....#......#",
    "#.###.#.###.#####..#",
    "#.#...#...#.....#..#",
    "#.#.#####.#####.#..#",
    "#.#.......#...#.#..#",
    "#.#######.#.#.#.#..#",
    "#.....~...#.#.#....#",
    "###.###.###.#.######",
    "#.....#.....#......#",
    "#.d...#.K.Y.#..B...#",
    "####################",
  ];

  private readonly TILE = 2; // world units per grid cell
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
  private spawnCell!: Position;
  private exitCell!: Position;

  // Collections
  private blocked = new Set<string>();
  private doors = new Map<string, AbstractMesh>();
  private autoDoors = new Map<string, AbstractMesh>();
  private boxes = new Map<string, AbstractMesh>();
  private keys = new Map<string, AbstractMesh>();
  private lava = new Map<string, AbstractMesh>();
  private buttons = new Map<string, { mesh: AbstractMesh, direction: number, toggled: boolean }>();

  // UI elements
  private hudElement: HTMLElement;
  private bannerElement: HTMLElement;


  // Mesh templates
  private wallUnit!: Mesh;

  constructor() {
    this.W = this.MAP[0].length;
    this.H = this.MAP.length;
    this.canvas = document.getElementById("c") as HTMLCanvasElement;
    this.hudElement = document.getElementById("hud") as HTMLElement;
    this.bannerElement = document.getElementById("banner") as HTMLElement;

    if (!this.canvas || !this.hudElement || !this.bannerElement) {
      throw new Error("Required HTML elements not found");
    }

    this.engine = parts.makeEngine(this.canvas);
    this.initScene();

    // Initialize map and load player asynchronously  
    this.initGeometry();
    this.initializeGameAsync();
  }

  private async initializeGameAsync(): Promise<void> {
    // Initialize geometry first (this loads the box model)
    
    // Initialize the map (this will load all keys)
    const cells = await parts.initMap(this.scene, { MAP: this.MAP, WALL_H: this.WALL_H, TILE: this.TILE }, {
      wallUnit: this.wallUnit,
    }, {
      blocked: this.blocked,
      boxes: this.boxes,
      doors: this.doors,
      autoDoors: this.autoDoors,
      keys: this.keys,
      lava: this.lava,
      buttons: this.buttons
    });
    Object.assign(this, cells); // Get spawn and exit cells

    // Create camera
    this.camera = parts.createCamera(this.scene, this.canvas);
    this.initInput();

    // Replace with real player asynchronously
    await this.loadPlayer();
    this.start();
  }

  private async loadPlayer(): Promise<void> {
    this.player = {
      x: this.spawnCell.x,
      y: this.spawnCell.y,
      keys: 0,
      mesh: await parts.makePlayer(this.scene),
      moving: false,
      rotation: 0 // Start facing right (0 radians)
    };


    // Update camera target
    this.camera.setTarget(this.player.mesh.position);
    this.placePlayer(this.player.x, this.player.y);
  }

  private initScene(): void {
    this.scene = parts.makeScene(this.engine);
  }



  private initGeometry(): void {
    // Ground
    parts.prepareGround(this.scene, { W: this.W, H: this.H, TILE: this.TILE });
    // Create unit meshes for instancing
    this.wallUnit = parts.makeWallUnit(this.scene, { TILE: this.TILE, WALL_H: this.WALL_H });

  }

  private initInput(): void {
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

  // Public methods for Python REPL control
  public async moveForward() {
    if (this.player.moving) return;
    return this.movePlayerForwardAsync();
  }

  public async turnLeft(): Promise<void> {
    if (this.player.moving) return;
    return new Promise((resolve) => {
      this.rotatePlayerAsync(Math.PI / 2, resolve);
    });
  }

  public async turnRight(): Promise<void> {
    if (this.player.moving) return;
    return new Promise((resolve) => {
      this.rotatePlayerAsync(-Math.PI / 2, resolve);
    });
  }



  private rotatePlayerAsync(deltaRotation: number, onComplete: () => void): void {
    // Set the player as moving to prevent other actions
    this.player.moving = true;

    const startRotation = this.player.rotation;
    const targetRotation = startRotation + deltaRotation;

    // Normalize target rotation
    const normalizedTarget = ((targetRotation % (2 * Math.PI)) + (2 * Math.PI)) % (2 * Math.PI);

    const startTime = performance.now();
    const duration = 200; // 200ms rotation animation

    const observer = this.scene.onBeforeRenderObservable.add(() => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Smooth easing
      const easedProgress = 0.5 - 0.5 * Math.cos(Math.PI * progress);

      // Interpolate rotation
      const currentRotation = startRotation + deltaRotation * easedProgress;
      this.player.rotation = currentRotation;
      this.player.mesh.rotation.y = -currentRotation;

      if (progress >= 1) {
        // Ensure final normalized rotation
        this.player.rotation = normalizedTarget;
        this.player.mesh.rotation.y = -normalizedTarget;
        this.player.moving = false;
        this.scene.onBeforeRenderObservable.remove(observer);
        onComplete();
      }
    });
  }

  private async movePlayerForwardAsync() {
    // Calculate the direction vector based on player rotation
    const dx = Math.cos(this.player.rotation);
    const dy = Math.sin(this.player.rotation);

    // Round to get grid-aligned movement
    const gridDx = Math.round(dx);
    const gridDy = Math.round(dy);

    return await this.attemptMoveAsync(gridDx, gridDy);
  }

  public async useAction(): Promise<void | string> {
    // First check if there's a button on current position
    const currentKey = parts.keyOf(this.player.x, this.player.y);
    if (this.buttons.has(currentKey)) {
      const button = this.buttons.get(currentKey)!;
      
      // Check if player is facing the correct direction
      const playerDirection = (-this.player.rotation + 2 * Math.PI) % (2 * Math.PI);
      const buttonDirection = (button.direction + 5 * Math.PI/2) % (2 * Math.PI);
      const directionThreshold = 0.1; // Small tolerance for direction matching
      
      const directionMatch = Math.abs(playerDirection - buttonDirection) < directionThreshold ||
                            Math.abs(playerDirection - buttonDirection) > (2 * Math.PI - directionThreshold);
      
      if (directionMatch && !button.toggled) {
        // Toggle the button
        button.toggled = true;
        
        // Animate button press - find mesh with $ suffix and move it down
        await this.animateButtonPress(button.mesh);
        
        return "Button activated!";
      } else if (button.toggled) {
        return "Button already activated.";
      } else {
        return "You need to face the button to activate it.";
      }
    }

    // Calculate the position directly in front of the player for door interaction
    const dx = Math.cos(this.player.rotation);
    const dy = Math.sin(this.player.rotation);
    const gridDx = Math.round(dx);
    const gridDy = Math.round(dy);

    const targetX = this.player.x + gridDx;
    const targetY = this.player.y + gridDy;
    const targetKey = parts.keyOf(targetX, targetY);

    // Check if there's a door in front of the player
    if (this.doors.has(targetKey)) {
      if (this.player.keys > 0) {
        this.player.keys--;
        this.updateHUD();

        // Get the door mesh and open it by rotating
        const doorMesh = this.doors.get(targetKey)!;

        await this.openDoorAsync(doorMesh);
        // Wait for door opening animation to complete
        this.doors.delete(targetKey);
        this.blocked.delete(targetKey);
        return "Door opened!";

      } else {
        return ("You need a key to open this door!");
      }
    } else {
      return "There's nothing to use here."
    }
  }

  private async openDoorAsync(doorMesh: AbstractMesh): Promise<void> {
    // Find the inner mesh (the actual door model) and rotate it
    const doorGroup = doorMesh as Mesh;
    const innerDoorMesh = doorGroup.getChildMeshes().find(mesh => mesh.name.endsWith('$'));

    if (innerDoorMesh) {
      // Animate the door opening by rotating it
      const startRotation = innerDoorMesh.rotation.y;
      const targetRotation = startRotation - Math.PI / 2;
      const startTime = performance.now();
      const duration = 500; // 500ms animation

      return new Promise((resolve) => {
        const observer = this.scene.onBeforeRenderObservable.add(() => {
          const elapsed = performance.now() - startTime;
          const progress = Math.min(elapsed / duration, 1);

          // Smooth easing
          const easedProgress = 0.5 - 0.5 * Math.cos(Math.PI * progress);

          // Interpolate rotation
          innerDoorMesh.rotation.y = startRotation + (targetRotation - startRotation) * easedProgress;

          if (progress >= 1) {
            this.scene.onBeforeRenderObservable.remove(observer);
            resolve();
          }
        })
      });
    }
  }

  private async animateButtonPress(buttonMesh: AbstractMesh): Promise<void> {
    // Find the inner mesh (the actual button model) with $ suffix
    const buttonGroup = buttonMesh as Mesh;
    const innerButtonMesh = buttonGroup.getChildMeshes().find(mesh => mesh.name.endsWith('$'));

    if (innerButtonMesh) {
      // Animate the button pressing down by moving it in Z axis
      const startZ = innerButtonMesh.position.z;
      const targetZ = startZ - 0.4; // Move down by 0.2 units
      const startTime = performance.now();
      const duration = 200; // 200ms animation

      return new Promise((resolve) => {
        const observer = this.scene.onBeforeRenderObservable.add(() => {
          const elapsed = performance.now() - startTime;
          const progress = Math.min(elapsed / duration, 1);

          // Smooth easing
          const easedProgress = 0.5 - 0.5 * Math.cos(Math.PI * progress);

          // Interpolate Z position
          innerButtonMesh.position.z = startZ + (targetZ - startZ) * easedProgress;

          if (progress >= 1) {
            this.scene.onBeforeRenderObservable.remove(observer);
            resolve();
          }
        })
      });
    }
  }


  private async attemptMoveAsync(dx: number, dy: number) {
    const nx = this.player.x + dx;
    const ny = this.player.y + dy;

    if (!this.inBounds(nx, ny)) {
      return "You can't go there";
    }

    const targetKey = parts.keyOf(nx, ny);

    // Doors now block movement - they must be opened with T key first
    if (this.doors.has(targetKey)) {
      return "Press T to open the door!";
    }

    // Handle box pushing
    if (this.boxes.has(targetKey)) {
      const bx = nx + dx;
      const by = ny + dy;
      const boxTargetKey = parts.keyOf(bx, by);

      if (!this.inBounds(bx, by) || this.isBlocked(bx, by)) {
        return "Can't push box";
      }
      
      const box = this.boxes.get(targetKey)!;
      this.boxes.delete(targetKey);
      this.blocked.delete(targetKey);

      if (this.lava.has(boxTargetKey)) {
        // Box is being pushed into lava - animate it falling and then remove both
        const lava = this.lava.get(boxTargetKey)!
        this.lava.delete(boxTargetKey);
        this.tweenPosition(
          box,
          this.cellToWorld(bx, by, this.TILE * 0.49), // Move to lava position first
          this.PUSH_MS,
          () => {
            // After box reaches lava, animate it falling down
                lava.dispose();
            this.tweenPosition(
              box,
              this.cellToWorld(bx, by, -this.TILE / 2 + .1), // Fall below ground level
              this.PUSH_MS / 2
            );
          }
        );
      } else {
        // Normal box push to empty space
        this.boxes.set(boxTargetKey, box);
        this.blocked.add(boxTargetKey);
        this.tweenPosition(
          box,
          this.cellToWorld(bx, by, this.TILE * 0.49),
          this.PUSH_MS
        );
      }
    }

    // Final check: if still blocked, can't move
    if (this.isBlocked(nx, ny)) {
      return "You can't go there";
    }

    // Move player with completion callback
    await this.movePlayerAsync(nx, ny);
  }

  private async movePlayerAsync(nx: number, ny: number): Promise<void> {
    this.player.moving = true;

    // Store initial positions for camera following
    const initialCameraPosition = this.camera.position.clone();
    const initialCameraTarget = this.camera.getTarget();
    const initialPlayerPosition = this.player.mesh.position.clone();
    const targetPlayerPosition = this.cellToWorld(nx, ny, this.TILE * 0.5);
    const movementDelta = targetPlayerPosition.subtract(initialPlayerPosition);

    await this.tweenPlayerAndCamera(
      targetPlayerPosition,
      this.MOVE_MS,
      initialCameraPosition,
      initialCameraTarget,
      movementDelta,
    );
    this.player.x = nx;
    this.player.y = ny;
    this.player.moving = false;
    await this.handlePlayerLanded();

  }

  private async tweenPlayerAndCamera(
    targetPos: Vector3,
    durationMs: number,
    initialCameraPosition: Vector3,
    initialCameraTarget: Vector3,
    movementDelta: Vector3,
  ): Promise<void> {
    const startPos = this.player.mesh.position.clone();
    const startTime = performance.now();

    return new Promise((resolve) => {
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
          resolve();
        }
      })
    });
  }

  private async handlePlayerLanded(): Promise<string | void> {
    const playerKey = parts.keyOf(this.player.x, this.player.y);

    // Key pickup
    if (this.keys.has(playerKey)) {
      // Get the key color before disposing
      this.keys.get(playerKey)!.dispose();
      this.keys.delete(playerKey);
      this.player.keys++;
      this.updateHUD();
    }

    // Lava check
    if (this.lava.has(playerKey)) {
      this.player.mesh.dispose();
      return "You fell in lava.";
    }

    // Exit check
    if (this.player.x === this.exitCell.x && this.player.y === this.exitCell.y) {
      return this.triggerWinAnimation();
    }
  }

  private async triggerWinAnimation(): Promise<string> {
    this.player.moving = true; // Prevent further movement during animation

    // Find the exit group to enhance its glow
    const exitKey = parts.keyOf(this.exitCell.x, this.exitCell.y);
    const exitGroup = this.scene.getMeshByName(`exitGroup_${this.exitCell.x}_${this.exitCell.y}`);

    // Enhance exit glow animation
    if (exitGroup) {
      this.enhanceExitGlow(exitGroup);
    }

    // Animate player rotating upward
    this.animatePlayerWin();

    // Show win message after a delay

    await new Promise(resolve => setTimeout(resolve, 1000));
    return "🎉 You win! Good job. 🎉";
  }

  private enhanceExitGlow(exitGroup: AbstractMesh): void {
    const orbMesh = exitGroup.getChildMeshes().find(mesh => mesh.name.includes('exitOrb'));

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

  private inBounds(i: number, j: number): boolean {
    return i >= 0 && j >= 0 && i < this.W && j < this.H;
  }

  private isBlocked(i: number, j: number): boolean {
    return this.blocked.has(parts.keyOf(i, j));
  }

  private updateHUD(): void {
    const keysContainer = document.getElementById("keys-container");
    if (!keysContainer) return;

    // Clear existing keys
    keysContainer.innerHTML = "";

    // If no keys, show empty state
    if (this.player.keys === 0) {
      keysContainer.innerHTML = '<div style="color: #666; font-style: italic; font-size: 12px;">Empty</div>';
      return;
    }
    keysContainer.innerHTML = '<div style="display: flex"><img width=30 src="/assets/models/key.png">' + this.player.keys + '</div>';

  }


  private start(): void {
    this.engine.runRenderLoop(() => this.scene.render());
    window.addEventListener("resize", () => this.engine.resize());
    this.updateHUD();
  }
}

// Initialize the game when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const game = new GridPuzzle3D();

  // Expose game controller to Python REPL via UI Manager
  setTimeout(() => {
    if ((window as any).setGameController) {
      (window as any).setGameController(game);
    }
  }, CONFIG.GAME_CONTROLLER_INIT_DELAY);
});

export type { GridPuzzle3D };