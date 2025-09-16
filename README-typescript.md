# Grid Puzzle 3D - TypeScript Version

A 3D grid-based puzzle game built with TypeScript and Babylon.js.

## Features

- 3D maze navigation with smooth animations
- Key collection and door unlocking mechanics
- Box pushing puzzles
- Lava hazards
- Win condition at exit
- Fully typed TypeScript implementation

## Setup

1. Install dependencies:
```bash
npm install
```

2. Build the TypeScript code:
```bash
npm run build
```

3. Serve the game locally:
```bash
npm run serve
```

4. Open your browser to `http://localhost:8080`

## Development

- `npm run dev` - Watch mode for TypeScript compilation
- `npm run build` - Build production version
- `npm run serve` - Serve the built game

## Controls

- **Arrow Keys** or **WASD** - Move player
- **R** - Reset game
- Collect keys (◆) to open doors (▒)
- Push boxes (■) to solve puzzles
- Avoid lava (~) 
- Reach the exit (E) to win!

## Architecture

The game is built with a clean TypeScript class structure:

- `GridPuzzle3D` - Main game class
- Type-safe interfaces for game entities
- Modular methods for game mechanics
- Proper resource management and cleanup

## Technologies

- TypeScript 5.0+
- Babylon.js 7.0+
- HTML5 Canvas
- ES2020+ features
