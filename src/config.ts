// Configuration constants for the application
export const CONFIG = {
  // Python Worker
  PYTHON_WORKER_URL: '/python-worker.js',
  PYODIDE_VERSION: '0.24.1',
  
  // UI Timing
  LOADING_SCREEN_DELAY: 1000,
  GAME_CONTROLLER_INIT_DELAY: 100,
  
  // Console
  CONSOLE_PROMPT: '>>> ',
  
  // Messages
  MESSAGES: {
    PYTHON_LOADING: 'Python 3.11.0 (WebAssembly) - Loading...',
    PYTHON_READY: 'Game controller functions ready!',
    WORKER_NOT_READY: 'Python Worker not ready yet. Please wait...',
    GAME_NOT_READY: 'Game controller not ready',
    COMMANDS_HELP: [
      '# Available commands (when ready):',
      '# step() - Move forward',
      '# left() - Turn left',
      '# right() - Turn right',
      '# toggle() - Use/interact with items',
      '# sleep(seconds) - Wait (doesn\'t freeze UI!)',
    ].join('\n>>> ')
  }
} as const;
