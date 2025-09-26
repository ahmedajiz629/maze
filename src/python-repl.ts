// Python REPL controller - handles communication between UI and Python Worker
import { CONFIG } from './config';

export class PythonREPL {
  private pythonWorker: Worker | null = null;
  private gameController: any = null;
  private consoleElement: HTMLElement;
  private inputElement: HTMLTextAreaElement;

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
      this.pythonWorker = new Worker(CONFIG.PYTHON_WORKER_URL);
      
      this.pythonWorker.onmessage = async (e) => {
        const { type, message, data, messageId, method, args } = e.data;
        
        switch (type) {
          case 'ready':
            this.updateConsole(message);
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
            
          case 'callGameMethod':
            // Handle game method calls from worker
            if (this.gameController && this.gameController[method]) {
              try {
                const result = await this.gameController[method](...args);
                this.pythonWorker!.postMessage({
                  type: 'gameMethodResult',
                  messageId,
                  result
                });
              } catch (error) {
                this.pythonWorker!.postMessage({
                  type: 'gameMethodResult',
                  messageId,
                  error: (error as Error).message
                });
              }
            } else {
              this.pythonWorker!.postMessage({
                type: 'gameMethodResult',
                messageId,
                error: 'Game controller not ready'
              });
            }
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

  private updateConsole(text: string): void {
    this.consoleElement.textContent += text;
    this.consoleElement.scrollTop = this.consoleElement.scrollHeight;
  }

  private handlePythonInput(): void {
    const code = this.inputElement.value.trim();
    
    if (!code) return;
    
    this.updateConsole(`>>> ${code}\n`);
    
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
