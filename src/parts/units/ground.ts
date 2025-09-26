import { MeshBuilder, Texture } from "@babylonjs/core";
import { Scene, StandardMaterial, Vector3 } from "@babylonjs/core";

export const prepareGround = (scene: Scene, config: { W: number, H: number, TILE: number }) => {
    const { W, H, TILE } = config;

    const matFloor = new StandardMaterial("floor", scene);
    const grassTexture = new Texture("assets/models/grass.png", scene);
    grassTexture.uScale = W; // Repeat texture across width
    grassTexture.vScale = H; // Repeat texture across height
    matFloor.diffuseTexture = grassTexture;
    
    const ground = MeshBuilder.CreateGround(
        "floor",
        { width: W * TILE, height: H * TILE, subdivisions: 2 },
        scene
    );
    ground.material = matFloor;
    ground.position = new Vector3(
        ((W - 1) * TILE) / 2,
        0,
        ((H - 1) * TILE) / 2
    );

}