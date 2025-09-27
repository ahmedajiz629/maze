// Web Worker for running Python code with Pyodide
let pyodide = null;
let gameControllerReady = false;
let sharedBuffer = null;
let sharedData = null;

// SharedArrayBuffer layout:
// [0] = ready flag (0=not ready, 1=ready)
// [1] = data length 
// [2...] = JSON data as UTF-16 char codes

// Helper function to call game methods synchronously via SharedArrayBuffer
function callGameMethodSync(methodName) {
  const methodMap = {
    'step': 1,
    'left': 2,
    'right': 3,
    'toggle': 4
  };

  const methodId = methodMap[methodName];
  
  // Reset ready flag
  Atomics.store(sharedData, 0, 0);
  
  // Write method ID
  Atomics.store(sharedData, 1, methodId);
  
  // Notify main thread
  postMessage({
    type: "gameMethodSync"
  });

  // Active wait on shared memory
  while (Atomics.load(sharedData, 0) === 0) {
    // Busy wait - will be unblocked when main thread sets ready flag
  }

  // Read JSON result
  const dataLength = Atomics.load(sharedData, 1);
  let jsonString = '';
  for (let i = 0; i < dataLength; i++) {
    jsonString += String.fromCharCode(Atomics.load(sharedData, 2 + i));
  }

  return JSON.parse(jsonString);
}

// Load Pyodide in the worker
async function initPyodide() {
  try {
    importScripts("https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js");
    pyodide = await loadPyodide();

    // Make the game method caller available globally
    pyodide.globals.set("callGameMethodSync", callGameMethodSync);



    // Define Python functions that call game methods synchronously
    await pyodide.runPython(`
import time

# Simple synchronous functions using SharedArrayBuffer communication
def step():
    """Move player forward"""
    if not gameControllerReady:
        print("Game not ready yet")
        return None
    return callGameMethodSync('step')

def left():
    """Turn player left"""
    if not gameControllerReady:
        print("Game not ready yet")
        return None
    return callGameMethodSync('left')

def right():
    """Turn player right"""
    if not gameControllerReady:
        print("Game not ready yet")
        return None
    return callGameMethodSync('right')

def toggle():
    """Use/interact with items"""
    if not gameControllerReady:
        print("Game not ready yet")
        return None
    return callGameMethodSync('toggle')

def sleep(seconds):
    """Sleep function that works in web worker"""
    import time
    time.sleep(seconds)

print("Game controller functions ready!")
print("Available commands: step(), left(), right(), toggle(), sleep()")
print("These functions are truly synchronous - no await needed!")
    `);

    postMessage({
      type: "ready",
      message: "Pyodide initialized! Game controller ready.\n",
    });
  } catch (error) {
    postMessage({
      type: "error",
      message: `Failed to load Pyodide: ${error.message}\n`,
    });
  }
}

// Handle messages from main thread
onmessage = async function (e) {
  const { type, data } = e.data;
  console.log("Worker received message:", e.data);

  switch (type) {
    case "init":
      await initPyodide();
      break;

    case "setSharedBuffer":
      sharedBuffer = e.data.sharedBuffer;
      sharedData = new Int32Array(sharedBuffer);
      console.log("SharedArrayBuffer initialized in worker");
      break;

    case "setGameController":
      gameControllerReady = true;
      if (pyodide) {
        pyodide.globals.set("gameControllerReady", gameControllerReady);
      }
      break;

    case "runCode":
      if (!pyodide) {
        postMessage({
          type: "error",
          message: "Pyodide not loaded yet. Please wait...\n",
        });
        return;
      }

      try {
        // Capture stdout
        pyodide.runPython(`
import sys
from io import StringIO
old_stdout = sys.stdout
sys.stdout = StringIO()
        `);

        const code = data.code;
        let result;


        // Always try async first (works for both sync and async code in Pyodide)
        console.log('Executing code:', code);
        const p = pyodide.runPythonAsync(code);
        console.log('Code running:', code);
        result = await p

        // Get stdout output
        const output = pyodide.runPython(`
output = sys.stdout.getvalue()
sys.stdout = old_stdout
output
        `);

        postMessage({
          type: "result",
          data: {
            output: output || "",
            result:
              result !== undefined && result !== null ? String(result) : null,
          },
        });
      } catch (error) {
        postMessage({ type: "error", message: `Error: ${error.message}\n` });
      }
      break;
  }
};
