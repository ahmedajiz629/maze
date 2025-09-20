# Player 3D Assets

This directory is for storing 3D player character models. The game will automatically try to load external assets before falling back to the procedural player.

## Recommended Free 3D Player Assets

### 1. Khronos glTF Sample Models (Always Available)
- **CesiumMan**: https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/CesiumMan/glTF/CesiumMan.gltf
- **Simple Soldier**: https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/SimpleSoldier/glTF/SimpleSoldier.gltf
- These are guaranteed to work and are hosted by Khronos Group

### 2. Mixamo Characters (Free with Adobe Account)
1. Go to https://www.mixamo.com/
2. Create a free Adobe account
3. Download characters in .glb format
4. Place them in this directory as `character.glb`

### 3. Free 3D Model Websites
- **Sketchfab**: https://sketchfab.com/3d-models?features=downloadable&sort_by=-likeCount&type=models
- **TurboSquid Free**: https://www.turbosquid.com/Search/3D-Models/free
- **CGTrader Free**: https://www.cgtrader.com/free-3d-models

### 4. Three.js Examples
- Robot: https://threejs.org/examples/models/gltf/RobotExpressive/RobotExpressive.glb

## File Naming Convention
- Place your main character file as `character.glb` or `player.glb`
- The game will try to load files in this order:
  1. `./assets/models/character.glb`
  2. `./models/player.glb`
  3. External URLs (CesiumMan, Robot, etc.)
  4. Fallback to procedural character

## Format Support
- `.glb` (recommended - single file)
- `.gltf` (with separate textures)
- Models should be roughly human-sized (1-2 units tall)
- Models will be automatically scaled to fit the game

## Current External URLs Tried by the Game
The game automatically tries these public URLs:
1. CesiumMan from Khronos glTF samples
2. RobotExpressive from Three.js examples
3. Local files in this directory
