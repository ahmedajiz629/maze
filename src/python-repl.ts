// Python REPL controller - handles communication between UI and Python Worker
import { CONFIG } from './config';
import { GridPuzzle3D } from './game';
import { ActionName } from './level';


export type Services = { readonly updateKeys: (keys: number) => void; readonly alert: (message: string) => void }
export class PythonREPL {
  private pythonWorker: Worker | null = null;
  private gameController: GridPuzzle3D | null = null;

  private sharedBuffer = new SharedArrayBuffer(1024 * 4); // 1KB for JSON data
  private sharedData = new Int32Array(this.sharedBuffer);

  // Callbacks for React integration

  constructor(
    private readonly handlers: {
      readonly onReady: () => void,
      readonly onOutput: (text: string) => void,
      readonly onError: (error: string) => void,
      readonly onResult: () => void,
    },
    private readonly getCanva: () => HTMLCanvasElement | null,
    private readonly services: Services
  ) {
    this.initPythonWorker();
  }


  private completionCallbacks = new Map<string, (status: 'complete' | 'incomplete' | 'syntax-error') => void>();

  private initPythonWorker(): void {
    try {
      // Create SharedArrayBuffer for synchronous communication
      // Structure: [0] = ready flag, [1] = data length, [2...] = JSON data as UTF-16 codes

      const worker = this.pythonWorker = new Worker(CONFIG.PYTHON_WORKER_URL);
      const waitReady = () => new Promise<void>((resolve) => {
        const handleReady = (e: MessageEvent) => {
          if (e.data.type === 'printed') {
            worker.removeEventListener('message', handleReady);
            resolve();
          }
        }
        worker.addEventListener('message', handleReady);
      })

      worker.onmessage = async (e) => {
        console.log("Host received message:", e.data);
        const { type, message, data } = e.data;

        switch (type) {
          case 'ready':
            this.handlers.onReady();
            break;

          case 'result':
            if (data.add) {
              const [funcName, code] = data.add;
              self.localStorage.setItem(`py:${funcName}`, code);
            }
            this.handlers.onResult();
            break;

          case 'error':
            this.handlers.onError(message);
            break;
          case 'print':
            this.handlers.onOutput(message);
            break;

          case 'completionCheck':
            // Handle completion check response
            const { requestId, status } = data;
            const callbacks = this.completionCallbacks;
            if (callbacks && callbacks.has(requestId)) {
              const callback = callbacks.get(requestId);
              callback?.(status);
              callbacks.delete(requestId);
            }
            break;

          case 'gameMethodSync':
            // Handle synchronous game method calls from worker via SharedArrayBuffer
            await this.handleSyncGameMethod(data.method, data.args, waitReady);
            break;

        }
      };

      worker.onerror = (error) => {
        console.error("Python Worker error:", error);
        this.handlers.onError("Python Worker error: " + error.message);
      };

      // Initialize Pyodide in the worker
      worker.postMessage({
        type: 'init', sharedBuffer: this.sharedBuffer,
        predefined: Object.fromEntries(Object.entries(localStorage).flatMap(([k, v]) => k.startsWith('py:') ? [[k.slice(3), v]] : []))
      });

    } catch (error) {
      console.error("Failed to create Python Worker:", error);
      this.handlers.onError("Failed to create Python Worker: " + (error as Error).message);
    }
  }
  get levels() {
    return localStorage.getItem('levels')
  }
  set levels(levels) {
    localStorage.setItem('levels', levels!)
  }
  get level() {
    return localStorage.getItem('level')
  }
  set level(level) {
    if (level)
      localStorage.setItem('level', level)
    else localStorage.removeItem('level')
  }
  private async handleSyncGameMethod(method: ActionName | 'level' | 'levels' | 'restart', args: unknown[], waitReady: () => Promise<void>): Promise<void> {
    const sendData = (data: string, type: 'result' | 'error' | 'output') => {
      if (!this.sharedData) throw new Error('Shared data not available');
      // JSON stringify the result and write to shared buffer
      const dataLength = data.length;

      // Write length at position 1
      Atomics.store(this.sharedData, 1, dataLength);

      // Write JSON data starting at position 2
      for (let i = 0; i < dataLength; i++) {
        Atomics.store(this.sharedData, 2 + i, data.charCodeAt(i));
      }

      // Set ready flag last
      Atomics.store(this.sharedData, 0, { result: 1, error: 2, output: 3 }[type]);
      Atomics.notify(this.sharedData, 0);
    }

    const print = (output: string) => {
      sendData(output, 'output')
      return waitReady()
    }
    const sendResult = (methodResult: unknown) => {
      const jsonData = JSON.stringify(methodResult ?? null);
      sendData(jsonData, 'result')
    }

    // Read method from shared memory  
    if (method === 'levels') {
      this.levels = args[0] as string
      method = 'level'
      args = ['$']
      this.level = null
    }
    if (method === 'restart') {
      method = 'level'
      args = [this.level]
    }
    if (method === 'level') {
      let l = args[0] as undefined | string
      const levelsStr = this.levels ?? 'basics'
      const { levels } = await { [levelsStr]: () => import('./basics'), blockly: () => import('./blockly') }[levelsStr]()
      if (l === '$') l = this.level ?? Object.keys(levels)[0]
      const level = l && levels[l]
      if (typeof l !== 'string') {
        return sendData('Please select a level first', 'error')
      }
      if (!level) return sendData('Unknown Level', 'error')
      this.level = l
      const data = level()
      if (this.gameController) {
        this.gameController.dispose()
      }
      const canvas = this.getCanva()
      if (!canvas) {
        return sendData('Canvas not ready', 'error')
      }
      this.gameController = new GridPuzzle3D(data, { canvas }, this.services);
      const actions = await this.gameController.initializeGameAsync()
      const defs = {
        step: 'step(): Move player forward',
        left: 'left(): Turn player left',
        right: 'right(): Turn player right',
        toggle: 'toggle(): Use/interact with items',
        safe: 'safe(): Check if the next position is safe',
        notDone: 'notDone(): Check if the game is not done',
        checkRight: "check('left' | 'right' | 'next'): Check if the given direction is safe",
        checkLeft: null,
      };

      this.handlers.onOutput(`\nWelcome to ${l} level\n# Available commands:\n${actions.flatMap(x => defs[x] ? [`# ${defs[x]}\n`] : []).join('')}`);
      return sendResult('$$')
    }
    if (!this.gameController) {
      return sendData("Please select a level, ex intro", 'error')
    }
    try {
      sendResult(await this.gameController.run(method, print))
    } catch (e) {
      sendData((e as Error).message, 'error')
    }
  }

  public executeCode(code: string): void {
    if (this.pythonWorker) {
      this.pythonWorker.postMessage({ type: 'runCode', data: { code } });
    } else {
      this.handlers.onError("Python Worker not ready. Please wait...");
    }
  }


  public checkCodeCompletion(code: string, callback: (status: 'complete' | 'incomplete' | 'syntax-error') => void): void {
    if (this.pythonWorker) {
      const requestId = Math.random().toString(36).substr(2, 9);

      // Store callback for this request
      this.completionCallbacks.set(requestId, callback);

      this.pythonWorker.postMessage({
        type: 'checkCompletion',
        data: { code, requestId }
      });
    } else {
      callback('complete'); // Fallback if worker not ready
    }
  }
  public dispose(): void {
    if (this.pythonWorker) {
      this.pythonWorker.terminate();
      this.pythonWorker = null;
    }
    if (this.gameController) {
      this.gameController.dispose();
      this.gameController = null;
    }
  }

}
