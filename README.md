# Maze Adventure Game

A 3D maze game built with Ursina Engine featuring lava, walls, keys, movable boxes, and more!

## Features

### Game Elements
- **Maze**: Procedurally generated maze with walls and open paths
- **Lava**: Animated lava pools that damage the player
- **Keys**: Collectible golden keys that rotate and glow
- **Movable Boxes**: Brown boxes that can be pushed around
- **Goal**: Green glowing cylinder that marks the victory point

### Gameplay Mechanics
- **Health System**: Player starts with 100 health, loses 20 per lava contact
- **Key Collection**: Must collect all 3 keys to unlock the goal
- **Box Pushing**: Use F key to push nearby boxes
- **Respawn**: Player respawns when health reaches 0
- **Invulnerability**: Brief invulnerability period after lava damage

### Visual Effects
- **Animated Lava**: Pulsing red/orange lava with vertical movement
- **Rotating Keys**: Keys spin and bob up and down with glowing effect
- **Dynamic Lighting**: Multiple colored point lights for atmosphere
- **Camera Shake**: Visual feedback for damage and key collection
- **Victory Animation**: Camera rotation when winning

## Controls

- **WASD**: Move around the maze
- **Mouse**: Look around (first-person view)
- **F**: Push nearby boxes
- **R**: Restart game (when dead or won)
- **H**: Show help in console
- **ESC**: Quit game

## Installation

1. Install required packages:
   ```bash
   pip install -r requirements.txt
   ```

2. Run the game:
   ```bash
   python maze_game.py
   ```

## Game Objective

1. Navigate through the maze avoiding lava pools
2. Collect all 3 golden keys scattered throughout the maze
3. Use boxes to help solve puzzles or block paths
4. Reach the green glowing goal to win!

## Tips

- Lava damages you but doesn't kill instantly - you have time to escape
- Keys are placed randomly each game for replay value
- Boxes can be pushed but not pulled - plan your moves carefully
- The maze has a grid-like structure with random elements
- Health regenerates when you respawn

Enjoy your maze adventure!
