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
function callGameMethodSync(method, print, ...args) {
  // Reset ready flag
  Atomics.store(sharedData, 0, 0);

  // Notify main thread
  postMessage({
    type: "gameMethodSync",
    data: { method, args },
  });

  while (true) {
    // Active wait on shared memory
    while (Atomics.wait(sharedData, 0, 0) !== "not-equal") {
      // Busy wait - will be unblocked when main thread sets ready flag
    }
    const status = Atomics.load(sharedData, 0);
    // Read JSON result
    const dataLength = Atomics.load(sharedData, 1);
    let dataRead = "";
    for (let i = 0; i < dataLength; i++) {
      dataRead += String.fromCharCode(Atomics.load(sharedData, 2 + i));
    }

    if (status === 3) {
      // print output
      print(dataRead);
      Atomics.store(sharedData, 0, 0);
      postMessage({ type: "printed" });
      continue;
    }
    const isError = status === 2;
    if (isError) throw dataRead;
    console.log("Game method response:", dataRead);
    const response = JSON.parse(dataRead);
    if (typeof response === "string" && response.startsWith("$$")) {
      pyodide.globals.set("gameControllerReady", true);
      if (response.length > 2) {
        const code = response.slice(2);
        pyodide.runPython(code);
      }
      return "Level loaded";
    }
    return response;
  }
}

// Load Pyodide in the worker
async function initPyodide(predefined) {
  try {
    importScripts("https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js");
    pyodide = await loadPyodide();

    // Make the game method caller available globally
    pyodide.globals.set("callGameMethod", callGameMethodSync);
    pyodide.globals.set("gameControllerReady", false);
    pyodide.globals.set("sendOutput", (message) =>
      postMessage({
        type: "print",
        message,
      })
    );

    // Define Python functions that call game methods synchronously
    await pyodide.runPython(`
import time
from pyodide.ffi import JsException

import sys
from io import StringIO
old_stdout = sys.stdout

class RealtimeStringIO(StringIO):
    def __init__(self):
        super().__init__()
    
    def write(self, s):
        # Send to JS immediately on each write
        sendOutput(s)
        return super().write(s)

def callGameMethodSync(method, *args):
    return callGameMethod(method, print, *args)

# Simple synchronous functions using SharedArrayBuffer communication
def step():
    """Move player forward"""
    return callGameMethodSync('step')

def left():
    """Turn player left"""
    return callGameMethodSync('left')

def right():
    """Turn player right"""
    return callGameMethodSync('right')

def toggle():
    """Use/interact with items"""
    return callGameMethodSync('toggle')

def safe():
    """Check if the next position is safe"""
    return callGameMethodSync('safe')

def notDone():
    """Check if the game is not done"""
    return callGameMethodSync('notDone')

def check(direction):
    """Check if the given direction is safe"""
    if direction == 'left':
        return callGameMethodSync('checkLeft')
    elif direction == 'right':
        return callGameMethodSync('checkRight')
    elif direction == 'next':
        return callGameMethodSync('safe')
    else:
        raise JsException("Invalid direction for check(): " + str(direction))

def level(name):
    """Change level"""
    return callGameMethodSync('level', name)

def levels(name):
    """Change levels"""
    return callGameMethodSync('levels', name)

def restart():
    """Change level"""
    return callGameMethodSync('restart')

def sleep(seconds):
    """Sleep function that works in web worker"""
    import time
    time.sleep(seconds)
${Object.entries(predefined)
  .map(([k, v]) => `${v}\n${k}.code = ${JSON.stringify(v)}`)
  .join("\n")}
level('$')
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
      sharedBuffer = e.data.sharedBuffer;
      sharedData = new Int32Array(sharedBuffer);
      await initPyodide(e.data.predefined);
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
from io import StringIO
sys.stdout = RealtimeStringIO()
        `);

        const code = data.code;
        let result;

        // Always try async first (works for both sync and async code in Pyodide)
        console.log("Executing code:", code);
        result = pyodide.runPython(code);
        //   `try:\n${code
        //     .split("\n")
        //     .map((x) => ` ${x}`)
        //     .join("\n")}\n except JsException as e: print(str(e))`
        // );
        console.log("Code running:", code);
        const match = /def\s+(\w+)\s*\(.*\):/.exec(code);
        pyodide.globals.set("_", result);
        if (match) {
          const k = match[1];
          pyodide.runPython(`${k}.code = ${JSON.stringify(code)}`);
        }

        // Get stdout output
        const output = pyodide.runPython(`
if _ is not None: print(_)
output = sys.stdout.getvalue()
sys.stdout = old_stdout
output
        `);
        console.log({ output });

        postMessage({
          type: "result",
          data: {
            add: match ? [match[1], code] : null,
          },
        });
      } catch (error) {
        console.error("Error during code execution:", error);
        postMessage({
          type: "error",
          message:
            error.type === "JsException"
              ? error.message.split("Error: ").at(-1)
              : `Error: ${error.message}\n`,
        });
      }
      break;

    case "checkCompletion":
      if (!pyodide) {
        postMessage({
          type: "completionCheck",
          data: { requestId: data.requestId, status: "incomplete" },
        });
        console.error('no pyodide');
        return;
      }

      try {
        // Import console module and check code completion using Python
        const result = pyodide.runPython(`
import pyodide.console
sys.stdout = old_stdout
console = pyodide.console.Console()
future = console.push(${JSON.stringify(data.code)})
future.syntax_check
        `);

        console.log('Completion check result:', data.code, result);
        
        postMessage({
          type: "completionCheck",
          data: { 
            requestId: data.requestId, 
            status: result 
          }
        });
      } catch (error) {
        console.error('Error during completion check:', error);
        // If there's an error checking, assume it's complete and let Python handle it
        postMessage({
          type: "completionCheck",
          data: { 
            requestId: data.requestId, 
            status: "incomplete" 
          }
        });
      }
      break;
  }
};
