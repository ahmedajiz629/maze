import {
    AbstractMesh,
    AnimationGroup,
    Color3,
    ImportMeshAsync,
    Mesh,
    MeshBuilder,
    Scene,
    StandardMaterial,
    Vector3
} from "@babylonjs/core";
import "@babylonjs/loaders/glTF";
export interface Player {
    x: number;
    y: number;
    keys: number;
    keysByColor: Map<string, number>; // Track keys by color
    mesh: AbstractMesh;
    moving: boolean;
    rotation: number; // Player's facing direction in radians
    animationGroups?: AnimationGroup[]; // Store animations if available
}

export class PlayerFactory {
    private scene: Scene;

    constructor(scene: Scene) {
        this.scene = scene;
    }

    // Try to load external asset first, fallback to procedural if needed
    async createRealisticPlayer(): Promise<AbstractMesh> {
        // List of publicly available 3D assets to try (supports GLB, GLTF, and FBX)
        const assetUrls = [
            "./assets/models/happy.glb"    // GLTF format
        ];

        for (const assetUrl of assetUrls) {
            try {
                const playerMesh = await this.loadExternalPlayerAsset(assetUrl);
                console.log("Successfully loaded player from:", assetUrl);
                return playerMesh;
            } catch (error) {
                console.log("Failed to load from:", assetUrl, "- trying next option");
                continue;
            }
        }

        // If all external assets failed, create procedural player
        console.log("All external assets failed, using procedural player");
        return this.createProceduralPlayer();
    }

    // Procedural player creation as fallback
    private createProceduralPlayer(): AbstractMesh {
        const playerGroup = new Mesh("playerGroup", this.scene);

        // Main body - using a capsule for a more modern look
        const body = MeshBuilder.CreateCapsule(
            "playerBody",
            { radius: 0.3, height: 1.2, subdivisions: 16 },
            this.scene
        );
        body.position.y = 0.6;
        body.parent = playerGroup;

        // Head - sphere with better proportions
        const head = MeshBuilder.CreateSphere(
            "playerHead",
            { diameter: 0.5, segments: 16 },
            this.scene
        );
        head.position.y = 1.4;
        head.parent = playerGroup;

        // Direction indicator - simple but effective
        const eyeStripe = MeshBuilder.CreateBox(
            "eyeStripe",
            { width: 0.4, height: 0.08, depth: 0.06 },
            this.scene
        );
        eyeStripe.position = new Vector3(0, 1.45, 0.22);
        eyeStripe.parent = playerGroup;

        // Arms - using cylinders for smoother appearance
        const leftArm = MeshBuilder.CreateCylinder(
            "leftArm",
            { height: 0.8, diameter: 0.15 },
            this.scene
        );
        leftArm.position = new Vector3(-0.45, 0.8, 0);
        leftArm.parent = playerGroup;

        const rightArm = MeshBuilder.CreateCylinder(
            "rightArm",
            { height: 0.8, diameter: 0.15 },
            this.scene
        );
        rightArm.position = new Vector3(0.45, 0.8, 0);
        rightArm.parent = playerGroup;

        // Legs - using cylinders for smoother appearance
        const leftLeg = MeshBuilder.CreateCylinder(
            "leftLeg",
            { height: 0.9, diameter: 0.18 },
            this.scene
        );
        leftLeg.position = new Vector3(-0.15, -0.45, 0);
        leftLeg.parent = playerGroup;

        const rightLeg = MeshBuilder.CreateCylinder(
            "rightLeg",
            { height: 0.9, diameter: 0.18 },
            this.scene
        );
        rightLeg.position = new Vector3(0.15, -0.45, 0);
        rightLeg.parent = playerGroup;

        // Apply modern materials with better colors
        const bodyMaterial = new StandardMaterial("modernBodyMat", this.scene);
        bodyMaterial.diffuseColor = new Color3(0.15, 0.45, 0.85); // Modern blue
        bodyMaterial.specularColor = new Color3(0.1, 0.1, 0.1); // Subtle shine
        body.material = bodyMaterial;
        leftArm.material = bodyMaterial;
        rightArm.material = bodyMaterial;

        const headMaterial = new StandardMaterial("modernHeadMat", this.scene);
        headMaterial.diffuseColor = new Color3(0.95, 0.8, 0.7); // Natural skin tone
        headMaterial.specularColor = new Color3(0.1, 0.1, 0.1);
        head.material = headMaterial;

        const eyeMaterial = new StandardMaterial("modernEyeMat", this.scene);
        eyeMaterial.diffuseColor = new Color3(0.1, 0.1, 0.1); // Dark stripe
        eyeMaterial.emissiveColor = new Color3(0.05, 0.05, 0.05); // Slight glow
        eyeStripe.material = eyeMaterial;

        const legMaterial = new StandardMaterial("modernLegMat", this.scene);
        legMaterial.diffuseColor = new Color3(0.25, 0.25, 0.3); // Dark pants
        legMaterial.specularColor = new Color3(0.1, 0.1, 0.1);
        leftLeg.material = legMaterial;
        rightLeg.material = legMaterial;

        // Add a subtle height adjustment so the player appears to stand on the ground
        playerGroup.position.y = 0.1;

        return playerGroup;
    }

    // Load external assets with proper scaling for maze game
    async loadExternalPlayerAsset(assetPath: string): Promise<AbstractMesh> {
        try {
            const result = await ImportMeshAsync(
                assetPath,
                this.scene,
            );

            if (result.meshes.length === 0) {
                throw new Error("No meshes found in the asset file");
            }

            // Get the root mesh or create a parent if multiple meshes
            let playerMesh = new Mesh("playerGroup", this.scene);
            result.meshes.forEach((mesh: AbstractMesh) => {
                if (mesh.name !== "__root__") {
                    mesh.parent = playerMesh;
                }
            });

            // Apply appropriate scaling based on file format and content
            if (assetPath.includes(".fbx")) {
                // FBX files are often larger scale, need more scaling down
                playerMesh.scaling = new Vector3(0.005, 0.005, 0.005);
                playerMesh.position.y = 0.1;
            } else if (assetPath.includes(".glb") || assetPath.includes(".gltf")) {
                // GLB/GLTF files are usually reasonably sized
                playerMesh.scaling = new Vector3(0.5, 0.5, 0.5);
                playerMesh.position.y = 0.1;
            } else {
                // Default scaling for unknown formats
                playerMesh.scaling = new Vector3(0.01, 0.01, 0.01);
                playerMesh.position.y = 0.1;
            }

            // Ensure the model faces forward (adjust rotation if needed)
            playerMesh.rotation.x = -Math.PI/2;
            playerMesh.rotation.z = Math.PI;
            playerMesh.position.z = 100;

            return playerMesh;
        } catch (error) {
            throw new Error(`Failed to load player asset from ${assetPath}: ${error}`);
        }
    }
}
