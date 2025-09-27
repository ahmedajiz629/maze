// Python REPL controller - handles communication between UI and Python Worker
import { CONFIG } from './config';
import type { GridPuzzle3D } from './game';

export class PythonREPL {
  private pythonWorker: Worker | null = null;
  private gameController: GridPuzzle3D | null = null;
  private consoleElement: HTMLElement;
  private inputElement: HTMLTextAreaElement;
  private sharedBuffer?: SharedArrayBuffer;
  private sharedData?: Int32Array;

  constructor() {
    this.consoleElement = document.getElementById('python-console') as HTMLElement;
    this.inputElement = document.getElementById('python-input') as HTMLTextAreaElement;
    
    if (!this.consoleElement || !this.inputElement) {
      throw new Error('Required Python REPL elements not found');
    }

    this.initPythonWorker();
    this.setupInputHandling();
  }

  private initPythonWorker(): void {
    try {
      // Create SharedArrayBuffer for synchronous communication
      // Structure: [messageId, method, arg1, arg2, arg3, result, ready]
      this.sharedBuffer = new SharedArrayBuffer(7 * 4); // 7 int32 values
      this.sharedData = new Int32Array(this.sharedBuffer);
      
      this.pythonWorker = new Worker(CONFIG.PYTHON_WORKER_URL);
      
      this.pythonWorker.onmessage = async (e) => {
        const { type, message, data, messageId, method, args } = e.data;
        
        switch (type) {
          case 'ready':
            this.updateConsole(message);
            // Send shared buffer to worker for synchronous communication
            this.pythonWorker!.postMessage({ 
              type: 'setSharedBuffer', 
              sharedBuffer: this.sharedBuffer 
            });
            // Send game controller ready signal if available
            if (this.gameController) {
              this.pythonWorker!.postMessage({ type: 'setGameController' });
            }
            break;
            
          case 'result':
            if (data.output) {
              this.updateConsole(data.output);
            }
            if (data.result) {
              this.updateConsole(data.result + '\n');
            }
            this.updateConsole(CONFIG.CONSOLE_PROMPT);
            break;
            
          case 'error':
            this.updateConsole(message);
            this.updateConsole(CONFIG.CONSOLE_PROMPT);
            break;
            
          case 'gameMethodSync':
            // Handle synchronous game method calls from worker via SharedArrayBuffer
            await this.handleSyncGameMethod();
            break;
            
        }
      };
      
      this.pythonWorker.onerror = (error) => {
        console.error("Python Worker error:", error);
        this.updateConsole("Python Worker error: " + error.message + "\n");
      };
      
      // Initialize Pyodide in the worker
      this.pythonWorker.postMessage({ type: 'init' });
      
    } catch (error) {
      console.error("Failed to create Python Worker:", error);
      this.updateConsole("Failed to create Python Worker: " + (error as Error).message + "\n");
    }
  }

  private async handleSyncGameMethod(): Promise<void> {
    if (!this.sharedData) return;
    
    try {
      // Read method from shared memory
      const method = Atomics.load(this.sharedData, 1);
      let result = 0; // Default success

      switch (method) {
        case 1: // step
          await this.gameController?.moveForward?.();
          break;
        case 2: // left
          await this.gameController?.turnLeft?.();
          break;
        case 3: // right
          await this.gameController?.turnRight?.();
          break;
        case 4: // toggle
          await this.gameController?.useAction?.();
          break;
        default:
          result = -1; // Method not found
      }

      // Write result to shared memory
      Atomics.store(this.sharedData, 5, result); // result at index 5
      Atomics.store(this.sharedData, 6, 1); // ready flag at index 6
      Atomics.notify(this.sharedData, 6); // Wake up the worker
    } catch (error) {
      console.error('Sync game method call failed:', error);
      if (this.sharedData) {
        Atomics.store(this.sharedData, 5, -1); // error result
        Atomics.store(this.sharedData, 6, 1); // ready flag
        Atomics.notify(this.sharedData, 6);
      }
    }
  }

  private updateConsole(text: string): void {
    this.consoleElement.textContent += text;
    this.consoleElement.scrollTop = this.consoleElement.scrollHeight;
  }

  private handlePythonInput(): void {
    const code = this.inputElement.value.trim();
    
    if (!code) return;
    
    this.updateConsole(`${code}\n`);
    
    if (this.pythonWorker) {
      // Send code to worker for execution
      this.pythonWorker.postMessage({ type: 'runCode', data: { code } });
    } else {
      this.updateConsole(CONFIG.MESSAGES.WORKER_NOT_READY + "\n");
      this.updateConsole(CONFIG.CONSOLE_PROMPT);
    }
    
    this.inputElement.value = '';
  }

  private setupInputHandling(): void {
    this.inputElement.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.handlePythonInput();
      }
    });
  }

  public setGameController(controller: any): void {
    this.gameController = controller;
    if (this.pythonWorker) {
      this.pythonWorker.postMessage({ type: 'setGameController' });
    }
  }
}
