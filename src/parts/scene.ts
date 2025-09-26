import { Color4, Engine, HemisphericLight, Scene, Vector3 } from "@babylonjs/core";

export const makeScene = (engine: Engine) => {

  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.1, 0.11, 0.12, 1);

  const light = new HemisphericLight("h", new Vector3(0, 1, 0), scene);
  light.intensity = 0.85;

  return scene;
}