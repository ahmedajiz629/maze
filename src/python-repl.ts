// Python REPL controller - handles communication between UI and Python Worker
import { CONFIG } from './config';
import { GridPuzzle3D } from './game';
import { levels } from './basics'

export class PythonREPL {
  private pythonWorker: Worker | null = null;
  private gameController: GridPuzzle3D | null = null;
  private consoleElement: HTMLElement;
  private loadingElement: HTMLElement;

  private sharedBuffer?: SharedArrayBuffer;
  private sharedData?: Int32Array;

  // Console state
  private currentLine: string = '';
  private multiLineBuffer: string[] = [];
  private isMultiLine: boolean = false;
  private cursorPosition: number = 0;
  private isReady: boolean = false;

  constructor() {
    this.consoleElement = document.getElementById('python-console') as HTMLElement;
    this.loadingElement = document.getElementById('loading')!;

    if (!this.consoleElement) {
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
            this.updateConsole('\n' + message);
            this.isReady = true;
            this.loadingElement.style.display = 'none';
            this.showPrompt();
            break;

          case 'result':
            if (data.output) {
              this.updateConsole(data.output);
            }
            if (data.result) {
              this.updateConsole(data.result + '\n');
            }
            if (data.add) {
              const [funcName, code] = data.add;
              self.localStorage.setItem(`py:${funcName}`, code);
            }
            this.showPrompt();
            break;

          case 'error':
            this.updateConsole(message);
            this.showPrompt();
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
        type: 'init', sharedBuffer: this.sharedBuffer,
        predefined: Object.entries(localStorage).flatMap(([k, v]) => k.startsWith('py:') ? [v] : [])
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
      if (l === '$') l = this.level ?? Object.keys('levels')[0]
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
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (i > 0) {
        this.consoleElement.appendChild(document.createTextNode('\n'));
      }
      if (lines[i]) {
        this.consoleElement.appendChild(document.createTextNode(lines[i]));
      }
    }
    this.consoleElement.scrollTop = this.consoleElement.scrollHeight;
  }

  private showPrompt(): void {
    const prompt = this.isMultiLine ? '... ' : '>>> ';
    this.consoleElement.appendChild(document.createTextNode(prompt));

    // Create input line container
    const inputContainer = document.createElement('span');
    inputContainer.className = 'input-line';
    this.consoleElement.appendChild(inputContainer);

    // Update the input display
    this.updateCurrentLineDisplay();

    this.consoleElement.scrollTop = this.consoleElement.scrollHeight;
  }

  private updateCurrentLineDisplay(): void {
    // Find the input line container
    const inputContainer = this.consoleElement.querySelector('.input-line') as HTMLSpanElement;
    if (!inputContainer) return;

    // Clear the container
    inputContainer.innerHTML = '';

    // Split current line at cursor position
    const beforeCursor = this.currentLine.slice(0, this.cursorPosition);
    const afterCursor = this.currentLine.slice(this.cursorPosition);

    // Add text before cursor
    if (beforeCursor) {
      inputContainer.appendChild(document.createTextNode(beforeCursor));
    }

    // Add cursor
    const cursor = document.createElement('span');
    cursor.className = 'cursor';
    inputContainer.appendChild(cursor);

    // Add text after cursor
    if (afterCursor) {
      inputContainer.appendChild(document.createTextNode(afterCursor));
    }
  }

  private updateCurrentLine(): void {
    this.updateCurrentLineDisplay();
  }

  private needsMoreInput(code: string): boolean {
    // Simple heuristic: if line ends with : or is indented, continue
    const lines = code.split('\n');
    const lastLine = lines[lines.length - 1];

    // If line ends with colon, need more input
    if (lastLine.trim().endsWith(':')) {
      return true;
    }

    // If line is indented and not empty, need more input
    if (lastLine.match(/^\s+\S/)) {
      return true;
    }

    // If we have an incomplete statement (unmatched brackets, quotes, etc.)
    try {
      // This is a simple check - in a real implementation you'd use AST parsing
      const openBrackets = (code.match(/[\(\[\{]/g) || []).length;
      const closeBrackets = (code.match(/[\)\]\}]/g) || []).length;
      const singleQuotes = (code.match(/'/g) || []).length;
      const doubleQuotes = (code.match(/"/g) || []).length;

      if (openBrackets !== closeBrackets || singleQuotes % 2 !== 0 || doubleQuotes % 2 !== 0) {
        return true;
      }
    } catch (e) {
      // If we can't parse, assume we need more input
      return true;
    }

    return false;
  }

  private executeCode(code: string): void {
    if (this.pythonWorker) {
      this.pythonWorker.postMessage({ type: 'runCode', data: { code } });
    } else {
      this.updateConsole(CONFIG.MESSAGES.WORKER_NOT_READY + "\n");
      this.showPrompt();
    }
  }

  private handleEnter(): void {
    if (!this.isReady) return;

    // Find the input container and finalize it
    const inputContainer = this.consoleElement.querySelector('.input-line') as HTMLSpanElement;
    if (inputContainer) {
      // Remove cursor and show complete line
      const cursor = inputContainer.querySelector('.cursor');
      if (cursor) cursor.remove();

      // Make sure the complete current line is shown
      inputContainer.textContent = this.currentLine;

      // Remove the input-line class so it won't be found again
      inputContainer.classList.remove('input-line');
    }

    // Add newline
    this.consoleElement.appendChild(document.createTextNode('\n'));

    if (this.isMultiLine) {
      // Add current line to buffer
      this.multiLineBuffer.push(this.currentLine);

      // Check if we should end multi-line mode
      if (this.currentLine.trim() === '' || !this.needsMoreInput(this.multiLineBuffer.join('\n'))) {
        // Execute the multi-line code
        const code = this.multiLineBuffer.join('\n');
        this.executeCode(code);

        // Reset state
        this.multiLineBuffer = [];
        this.isMultiLine = false;
        this.currentLine = '';
        this.cursorPosition = 0;
        return;
      }
    } else {
      // Single line mode
      if (this.currentLine.trim() === '') {
        this.showPrompt();
        return;
      }

      if (this.needsMoreInput(this.currentLine)) {
        // Enter multi-line mode
        this.isMultiLine = true;
        this.multiLineBuffer = [this.currentLine];
        this.currentLine = '';
        this.cursorPosition = 0;
        this.showPrompt();
        return;
      } else {
        // Execute single line
        this.executeCode(this.currentLine);
        this.currentLine = '';
        this.cursorPosition = 0;
        return;
      }
    }

    // Continue multi-line input
    this.currentLine = '';
    this.cursorPosition = 0;
    this.showPrompt();
  }

  private setupInputHandling(): void {
    this.consoleElement.addEventListener('keydown', (e: KeyboardEvent) => {
      if (!this.isReady) return;

      // Prevent default for most keys to avoid browser behavior
      e.preventDefault();

      switch (e.key) {
        case 'Enter':
          this.handleEnter();
          break;

        case 'Backspace':
          if (this.cursorPosition > 0) {
            this.currentLine = this.currentLine.slice(0, this.cursorPosition - 1) +
              this.currentLine.slice(this.cursorPosition);
            this.cursorPosition--;
            this.updateCurrentLine();
          }
          break;

        case 'Delete':
          if (this.cursorPosition < this.currentLine.length) {
            this.currentLine = this.currentLine.slice(0, this.cursorPosition) +
              this.currentLine.slice(this.cursorPosition + 1);
            this.updateCurrentLine();
          }
          break;

        case 'ArrowLeft':
          if (this.cursorPosition > 0) {
            this.cursorPosition--;
            // Update cursor position visually would require more complex cursor management
          }
          break;

        case 'ArrowRight':
          if (this.cursorPosition < this.currentLine.length) {
            this.cursorPosition++;
            // Update cursor position visually would require more complex cursor management
          }
          break;

        case 'Home':
          this.cursorPosition = 0;
          break;

        case 'End':
          this.cursorPosition = this.currentLine.length;
          break;

        default:
          // Handle printable characters
          if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
            this.currentLine = this.currentLine.slice(0, this.cursorPosition) +
              e.key +
              this.currentLine.slice(this.cursorPosition);
            this.cursorPosition++;
            this.updateCurrentLine();
          }
          break;
      }
    });

    // Focus the console so it can receive keyboard input
    this.consoleElement.focus();

    // Refocus when clicked
    this.consoleElement.addEventListener('click', () => {
      this.consoleElement.focus();
    });
  }

}
