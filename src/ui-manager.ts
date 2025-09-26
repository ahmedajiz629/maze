// UI initialization and management
import { PythonREPL } from './python-repl';
import { CONFIG } from './config';

export class UIManager {
  private pythonREPL: PythonREPL;
  private loadingElement: HTMLElement | null;

  constructor() {
    this.loadingElement = document.getElementById('loading');
    this.pythonREPL = new PythonREPL();
    this.setupLoadingScreen();
  }

  private setupLoadingScreen(): void {
    // Hide loading screen once everything is initialized
    window.addEventListener('load', () => {
      setTimeout(() => {
        if (this.loadingElement) {
          this.loadingElement.style.display = 'none';
        }
      }, CONFIG.LOADING_SCREEN_DELAY);
    });
  }

  public setGameController(controller: any): void {
    this.pythonREPL.setGameController(controller);
  }
}

// Global UI manager instance
let uiManager: UIManager;

// Initialize UI when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  uiManager = new UIManager();
});

// Make setGameController available globally so game.ts can use it
(window as any).setGameController = function(controller: any) {
  if (uiManager) {
    uiManager.setGameController(controller);
  }
};
