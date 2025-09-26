import { ArcRotateCamera, Scene, Vector3 } from "@babylonjs/core";

export const createCamera = (scene: Scene, canvas: HTMLCanvasElement) => {
  // Create ArcRotateCamera for better mouse control
  const camera = new ArcRotateCamera(
    "cam",
    -Math.PI / 2, // Alpha (horizontal rotation)
    Math.PI / 3,  // Beta (vertical rotation)
    15,           // Radius (distance from target)
    Vector3.Zero(), // Initial target
    scene
  );

  // Enable mouse controls for camera rotation
  camera.attachControl(canvas, true);

  // Configure mouse rotation sensitivity (lower = more sensitive)
  camera.angularSensibilityX = 1000; // Horizontal rotation sensitivity
  camera.angularSensibilityY = 1000; // Vertical rotation sensitivity

  // Configure wheel zoom sensitivity
  camera.wheelPrecision = 20;

  // Set rotation limits to prevent camera from going too high or low
  camera.lowerBetaLimit = 0.1; // Minimum vertical angle (prevent going below ground)
  camera.upperBetaLimit = Math.PI / 2.2; // Maximum vertical angle (prevent going too high)

  // Set distance limits
  camera.lowerRadiusLimit = 5;  // Minimum zoom distance
  camera.upperRadiusLimit = 30; // Maximum zoom distance

  return camera;
}