from ursina import *
from ursina.prefabs.first_person_controller import FirstPersonController
import random
from math import sin, cos
import time

app = Ursina()

# Game settings
MAZE_SIZE = 15
CELL_SIZE = 2
player_speed = 5
keys_collected = 0
total_keys = 3
game_won = False
lava_damage_timer = 0

# Colors and materials
WALL_COLOR = color.gray
FLOOR_COLOR = color.light_gray
LAVA_COLOR = color.red
KEY_COLOR = color.yellow
BOX_COLOR = color.brown
GOAL_COLOR = color.green

class MazeCell:
    def __init__(self, x, z, cell_type='floor'):
        self.x = x
        self.z = z
        self.cell_type = cell_type
        self.entity = None
        self.create_entity()
    
    def create_entity(self):
        pos = (self.x * CELL_SIZE, 0, self.z * CELL_SIZE)
        
        if self.cell_type == 'wall':
            self.entity = Entity(
                model='cube',
                color=WALL_COLOR,
                position=pos,
                scale=(CELL_SIZE, CELL_SIZE * 2, CELL_SIZE)
            )
        elif self.cell_type == 'lava':
            # Create animated lava
            self.entity = Entity(
                model='cube',
                color=LAVA_COLOR,
                position=(pos[0], -0.2, pos[2]),
                scale=(CELL_SIZE, 0.4, CELL_SIZE),
                texture='white_cube'
            )
            # Add lava animation
            self.animate_lava()
        elif self.cell_type == 'floor':
            self.entity = Entity(
                model='cube',
                color=FLOOR_COLOR,
                position=(pos[0], -0.5, pos[2]),
                scale=(CELL_SIZE, 0.1, CELL_SIZE)
            )
    
    def animate_lava(self):
        if self.entity:
            # Animate lava with glowing effect
            def lava_animation():
                if self.entity:
                    self.entity.color = lerp(color.red, color.orange, (sin(time.time() * 3) + 1) / 2)
                    self.entity.y = -0.2 + sin(time.time() * 2) * 0.1
            
            # Set up continuous animation
            invoke(lava_animation, delay=0)
            invoke(lava_animation, delay=0.1)

class Key(Entity):
    def __init__(self, position):
        super().__init__(
            model='cube',
            color=KEY_COLOR,
            position=position,
            scale=0.5
        )
        self.rotation_speed = 100
        # Add glowing effect
        self.animate_key()
    
    def animate_key(self):
        # Rotate the key
        self.rotation_y += self.rotation_speed * time.dt
        # Bob up and down
        self.y = 1 + sin(time.time() * 3) * 0.2
        # Glowing effect
        brightness = (sin(time.time() * 4) + 1) / 2
        self.color = lerp(color.yellow, color.white, brightness)
        
        # Continue animation
        invoke(self.animate_key, delay=1/60)

class MovableBox(Entity):
    def __init__(self, position):
        super().__init__(
            model='cube',
            color=BOX_COLOR,
            position=position,
            scale=(1.5, 1.5, 1.5)
        )
        self.original_y = position[1]
        self.is_being_pushed = False
    
    def move_to(self, new_position):
        # Check if the new position is valid (not a wall or lava)
        maze_x = int(new_position[0] / CELL_SIZE)
        maze_z = int(new_position[2] / CELL_SIZE)
        
        if (0 <= maze_x < MAZE_SIZE and 0 <= maze_z < MAZE_SIZE and 
            maze[maze_z][maze_x].cell_type in ['floor']):
            self.position = new_position
            return True
        return False

class Player(FirstPersonController):
    def __init__(self):
        super().__init__()
        self.position = (1 * CELL_SIZE, 1, 1 * CELL_SIZE)
        self.speed = player_speed
        self.health = 100
        self.invulnerable_timer = 0
    
    def update(self):
        super().update()
        
        # Check collision with lava
        self.check_lava_collision()
        
        # Check collision with keys
        self.check_key_collision()
        
        # Check collision with goal
        self.check_goal_collision()
        
        # Handle box pushing
        self.handle_box_pushing()
        
        # Update invulnerability timer
        if self.invulnerable_timer > 0:
            self.invulnerable_timer -= time.dt
    
    def check_lava_collision(self):
        maze_x = int(self.position[0] / CELL_SIZE)
        maze_z = int(self.position[2] / CELL_SIZE)
        
        if (0 <= maze_x < MAZE_SIZE and 0 <= maze_z < MAZE_SIZE and 
            maze[maze_z][maze_x].cell_type == 'lava' and self.invulnerable_timer <= 0):
            self.health -= 20
            self.invulnerable_timer = 1.0  # 1 second of invulnerability
            print(f"Ouch! Lava damage! Health: {self.health}")
            
            # Visual feedback
            camera.shake(intensity=0.1, duration=0.3)
            
            if self.health <= 0:
                self.respawn()
    
    def check_key_collision(self):
        global keys_collected
        for key in keys[:]:
            if distance(self.position, key.position) < 2:
                keys.remove(key)
                destroy(key)
                keys_collected += 1
                print(f"Key collected! {keys_collected}/{total_keys}")
                # Visual feedback
                camera.shake(intensity=0.05, duration=0.2)
    
    def check_goal_collision(self):
        global game_won
        if distance(self.position, goal.position) < 2 and keys_collected >= total_keys:
            game_won = True
            print("Congratulations! You won!")
            # Victory animation
            camera.animate_rotation((360, 0, 0), duration=2, curve=curve.in_out_expo)
    
    def handle_box_pushing(self):
        if held_keys['f']:  # Press F to push boxes
            # Find nearby boxes
            for box in boxes:
                if distance(self.position, box.position) < 3:
                    # Calculate push direction
                    direction = (self.position - box.position).normalized()
                    new_pos = box.position - direction * CELL_SIZE
                    box.move_to(new_pos)
                    break
    
    def respawn(self):
        self.position = (1 * CELL_SIZE, 1, 1 * CELL_SIZE)
        self.health = 100
        print("Respawned!")

def generate_maze():
    # Create a simple maze with walls around the border and some internal structure
    maze_layout = []
    
    for z in range(MAZE_SIZE):
        row = []
        for x in range(MAZE_SIZE):
            if (x == 0 or x == MAZE_SIZE-1 or z == 0 or z == MAZE_SIZE-1):
                # Border walls
                row.append('wall')
            elif (x % 2 == 0 and z % 2 == 0):
                # Internal walls in a grid pattern
                row.append('wall')
            elif random.random() < 0.15:
                # Random lava
                row.append('lava')
            else:
                row.append('floor')
        maze_layout.append(row)
    
    # Ensure starting position is floor
    maze_layout[1][1] = 'floor'
    
    # Create goal area
    maze_layout[MAZE_SIZE-2][MAZE_SIZE-2] = 'floor'
    
    # Add some strategic walls and clearings
    for i in range(3, MAZE_SIZE-3, 4):
        for j in range(3, MAZE_SIZE-3, 4):
            # Create some rooms
            for di in range(-1, 2):
                for dj in range(-1, 2):
                    if 0 <= i+di < MAZE_SIZE and 0 <= j+dj < MAZE_SIZE:
                        maze_layout[i+di][j+dj] = 'floor'
    
    return maze_layout

def create_maze(layout):
    maze = []
    for z, row in enumerate(layout):
        maze_row = []
        for x, cell_type in enumerate(row):
            cell = MazeCell(x, z, cell_type)
            maze_row.append(cell)
        maze.append(maze_row)
    return maze

def place_keys():
    keys = []
    placed = 0
    attempts = 0
    
    while placed < total_keys and attempts < 100:
        x = random.randint(2, MAZE_SIZE-3)
        z = random.randint(2, MAZE_SIZE-3)
        
        if maze_layout[z][x] == 'floor':
            key_pos = (x * CELL_SIZE, 1.5, z * CELL_SIZE)
            key = Key(key_pos)
            keys.append(key)
            placed += 1
        
        attempts += 1
    
    return keys

def place_boxes():
    boxes = []
    box_count = 3
    placed = 0
    attempts = 0
    
    while placed < box_count and attempts < 50:
        x = random.randint(3, MAZE_SIZE-4)
        z = random.randint(3, MAZE_SIZE-4)
        
        if maze_layout[z][x] == 'floor':
            box_pos = (x * CELL_SIZE, 0.75, z * CELL_SIZE)
            box = MovableBox(box_pos)
            boxes.append(box)
            placed += 1
        
        attempts += 1
    
    return boxes

def create_goal():
    goal_pos = ((MAZE_SIZE-2) * CELL_SIZE, 1, (MAZE_SIZE-2) * CELL_SIZE)
    goal = Entity(
        model='cube',
        color=GOAL_COLOR,
        position=goal_pos,
        scale=(2, 0.5, 2)
    )
    
    # Add goal animation
    def animate_goal():
        if goal:
            goal.rotation_y += 50 * time.dt
            goal.color = lerp(color.green, color.white, (sin(time.time() * 2) + 1) / 2)
        invoke(animate_goal, delay=1/60)
    
    animate_goal()
    return goal

def create_lighting():
    # Main light
    DirectionalLight(
        position=(10, 10, 10),
        rotation=(45, 45, 0),
        color=color.white,
        intensity=2
    )
    
    # Ambient light
    AmbientLight(color=color.rgb(50, 50, 100), intensity=0.3)
    
    # Add some colored lights for atmosphere
    for i in range(3):
        x = random.randint(2, MAZE_SIZE-3) * CELL_SIZE
        z = random.randint(2, MAZE_SIZE-3) * CELL_SIZE
        PointLight(
            position=(x, 3, z),
            color=random.choice([color.blue, color.magenta, color.cyan]),
            intensity=0.5
        )

def update():
    global lava_damage_timer
    
    # Update lava animation for all lava cells
    for row in maze:
        for cell in row:
            if cell.cell_type == 'lava' and cell.entity:
                # Continuous lava animation
                cell.entity.color = lerp(color.red, color.orange, (sin(time.time() * 3) + 1) / 2)
                cell.entity.y = -0.2 + sin(time.time() * 2) * 0.1

def input(key):
    global game_won
    
    if key == 'escape':
        quit()
    
    if key == 'r' and (player.health <= 0 or game_won):
        # Restart game
        restart_game()
    
    if key == 'h':
        # Show help
        print("Controls:")
        print("WASD - Move")
        print("Mouse - Look around")
        print("F - Push nearby boxes")
        print("R - Restart (when dead or won)")
        print("ESC - Quit")

def restart_game():
    global keys_collected, game_won, keys, boxes, goal
    
    # Reset game state
    keys_collected = 0
    game_won = False
    player.health = 100
    player.position = (1 * CELL_SIZE, 1, 1 * CELL_SIZE)
    
    # Remove old keys and boxes
    for key in keys:
        destroy(key)
    for box in boxes:
        destroy(box)
    
    # Create new keys and boxes
    keys = place_keys()
    boxes = place_boxes()
    
    print("Game restarted!")

# Generate and create the maze
maze_layout = generate_maze()
maze = create_maze(maze_layout)

# Create game objects
player = Player()
keys = place_keys()
boxes = place_boxes()
goal = create_goal()

# Setup lighting
create_lighting()

# Setup camera
camera.position = player.position + Vec3(0, 2, 0)
camera.rotation_x = -10

# Create UI
ui_text = Text(
    f'Keys: {keys_collected}/{total_keys} | Health: {player.health} | F: Push Box | R: Restart',
    position=(-0.85, 0.45),
    scale=1.5,
    color=color.white
)

def ui_update():
    ui_text.text = f'Keys: {keys_collected}/{total_keys} | Health: {player.health} | F: Push Box | R: Restart'
    if game_won:
        ui_text.text += " | YOU WON!"
    elif player.health <= 0:
        ui_text.text += " | GAME OVER - Press R to restart"

# Update UI every frame
def game_update():
    ui_update()
    invoke(game_update, delay=0.1)

game_update()

# Show initial instructions
print("Welcome to the Maze Adventure!")
print("Collect all keys to unlock the goal!")
print("Avoid lava - it damages you!")
print("Use F to push boxes around!")
print("Press H for help")

# Start the game
app.run()
