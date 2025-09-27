// Python REPL controller - handles communication between UI and Python Worker
import { CONFIG } from './config';
import { GridPuzzle3D } from './game';
import { levels } from './basics'

export class PythonREPL {
  private pythonWorker: Worker | null = null;
  private gameController: GridPuzzle3D | null = null;
  private consoleElement: HTMLElement;
  private inputElement: HTMLTextAreaElement;
  private loadingElement: HTMLElement;

  private sharedBuffer?: SharedArrayBuffer;
  private sharedData?: Int32Array;

  constructor() {
    this.consoleElement = document.getElementById('python-console') as HTMLElement;
    this.inputElement = document.getElementById('python-input') as HTMLTextAreaElement;
    this.loadingElement = document.getElementById('loading')!;

    if (!this.consoleElement || !this.inputElement) {
      throw new Error('Required Python REPL elements not found');
    }

    this.initPythonWorker();
    this.setupInputHandling();
  }

  private initPythonWorker(): void {
    try {
      // Create SharedArrayBuffer for synchronous communication
      // Structure: [0] = ready flag, [1] = data length, [2...] = JSON data as UTF-16 codes
      this.sharedBuffer = new SharedArrayBuffer(1024 * 4); // 1KB for JSON data
      this.sharedData = new Int32Array(this.sharedBuffer);

      this.pythonWorker = new Worker(CONFIG.PYTHON_WORKER_URL);

      this.pythonWorker.onmessage = async (e) => {
        const { type, message, data } = e.data;

        switch (type) {
          case 'ready':
            this.updateConsole(message);
            // Send shared buffer to worker for synchronous communication
            this.inputElement.disabled = false
            this.loadingElement.style.display = 'none';
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
            await this.handleSyncGameMethod(data.method, data.args);
            break;

        }
      };

      this.pythonWorker.onerror = (error) => {
        console.error("Python Worker error:", error);
        this.updateConsole("Python Worker error: " + error.message + "\n");
      };

      // Initialize Pyodide in the worker
      this.pythonWorker.postMessage({
        type: 'init', sharedBuffer: this.sharedBuffer
      });

    } catch (error) {
      console.error("Failed to create Python Worker:", error);
      this.updateConsole("Failed to create Python Worker: " + (error as Error).message + "\n");
    }
  }
  get level() {
    return localStorage.getItem('level')
  }
  set level(level) {
    localStorage.setItem('level', level!)
  }
  private async handleSyncGameMethod(method: 'step' | 'left' | 'right' | 'toggle' | 'safe' | 'level' | 'restart', args: unknown[]): Promise<void> {
    if (!this.sharedData) return;

    // Read method from shared memory  
    let methodResult: unknown;
    if (method === 'restart') {
      method = 'level'
      args = [this.level]
    }
    if (method === 'level') {
      let l = args[0] as undefined | string
      if(l === '$') l = this.level ?? Object.keys('levels')[0]
      const level = l && levels[l]
      if (typeof l !== 'string') {
        methodResult = 'Please select a level first'
      } else if (!level) methodResult = 'Unknown Level'
      else {
        this.level = l
        const data = level()
        if (this.gameController) {
          this.gameController.dispose()
        }
        this.gameController = new GridPuzzle3D(data.MAP, data.TIME_MS)
        await this.gameController.initializeGameAsync()
        methodResult = '$$'
      }
    } else if (!this.gameController) {
      methodResult = "Please select a level, ex basic"
    } else {

      methodResult = await this.gameController.run(method)
    }




    // JSON stringify the result and write to shared buffer
    const jsonResult = JSON.stringify(methodResult ?? null);
    const dataLength = jsonResult.length;

    // Write length at position 1
    Atomics.store(this.sharedData, 1, dataLength);

    // Write JSON data starting at position 2
    for (let i = 0; i < dataLength; i++) {
      Atomics.store(this.sharedData, 2 + i, jsonResult.charCodeAt(i));
    }

    // Set ready flag last
    Atomics.store(this.sharedData, 0, 1);
    Atomics.notify(this.sharedData, 0);
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

}
