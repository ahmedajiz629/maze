import { AbstractMesh, ImportMeshAsync, Mesh, Scene, Vector3 } from "@babylonjs/core";
import { keyOf } from "../keyOf";

const makeButton = async (scene: Scene, config: { TILE: number }) => {
    const result = await ImportMeshAsync("assets/models/btn.glb", scene);

    // Create a parent mesh for the imported button model
    const buttonGroup_ = new Mesh(`button$`, scene);

    // Parent all imported meshes to our button group
    result.meshes.forEach(mesh => {
        if (mesh.name === "__root__") {
            mesh.parent = buttonGroup_;
            // Scale the button to fit the tile size
            const scale = 5; // Adjust as needed
            mesh.scaling = new Vector3(scale, scale, scale);
        }
    });

    buttonGroup_.position = new Vector3(0, -.5, .2); // Center the button
    const buttonGroup = new Mesh(`button`, scene);
    buttonGroup_.parent = buttonGroup;
    return buttonGroup;
}

export const createButton = async function (
    scene: Scene,
    config: { TILE: number },
    i: number,
    j: number,
    p: Vector3,
    state: { buttons: Map<string, { mesh: AbstractMesh, direction: number, toggled: boolean }> },
    buttonType: string // 'A', 'a', 'B', 'b'
): Promise<void> {
    const buttonGroup = await makeButton(scene, { TILE: config.TILE });
    buttonGroup.position = p.add(new Vector3(0, config.TILE * 0.1, 0)); // Place on ground level

    // Set button direction based on type
    let direction = 0; // 0 = right, π/2 = up, π = left, 3π/2 = down
    switch (buttonType) {
        case 'T': // Right
            direction = 0;
            buttonGroup.rotation.y = 0;
            break;
        case 't': // Left  
            direction = Math.PI;
            buttonGroup.rotation.y = Math.PI;
            break;
        case 'Y': // Up
            direction = Math.PI / 2;
            buttonGroup.rotation.y = Math.PI / 2;
            break;
        case 'y': // Down
            direction = 3 * Math.PI / 2;
            buttonGroup.rotation.y = 3 * Math.PI / 2;
            break;
    }

    state.buttons.set(keyOf(i, j), {
        mesh: buttonGroup,
        direction: direction,
        toggled: false
    });
}
