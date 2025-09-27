import { CONFIG } from "./config";
import { GridPuzzle3D } from "./game";

// Initialize the game when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const game = new GridPuzzle3D([
    "##########",
    "#S...~..E#",
    "###.#B####",
    "###...####",
    "##########",
  ]);

  // Expose game controller to Python REPL via UI Manager
  setTimeout(() => {
    if ((window as any).setGameController) {
      (window as any).setGameController(game);
    }
  }, CONFIG.GAME_CONTROLLER_INIT_DELAY);
});
