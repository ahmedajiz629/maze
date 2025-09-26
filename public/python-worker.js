// Web Worker for running Python code with Pyodide
let pyodide = null;
let gameControllerReady = false;

// Helper function to call game methods via message passing (synchronous blocking)
function callGameMethodSync(method, ...args) {
  const messageId = Math.random().toString(36).substr(2, 9);
  let result = null;
  let completed = false;
  let error = null;
  
  // Set up listener for response
  const responseHandler = (e) => {
    if (e.data.type === 'gameMethodResult' && e.data.messageId === messageId) {
      self.removeEventListener('message', responseHandler);
      if (e.data.error) {
        error = e.data.error;
      } else {
        result = e.data.result;
      }
      completed = true;
    }
  };
  
  self.addEventListener('message', responseHandler);
  
  // Send request to main thread
  postMessage({
    type: 'callGameMethod',
    messageId,
    method,
    args
  });
  
  // Busy wait until response (synchronous blocking)
  while (!completed) {
    // Small delay to prevent excessive CPU usage
    const start = Date.now();
    while (Date.now() - start < 10) {
      // Busy wait for 10ms
    }
  }
  
  if (error) {
    throw new Error(error);
  }
  
  return result;
}

// Load Pyodide in the worker
async function initPyodide() {
  try {
    importScripts('https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js');
    pyodide = await loadPyodide();
    
    // Make the game method caller available globally
    pyodide.globals.set("callGameMethodSync", callGameMethodSync);
    
    // Define Python functions that call game methods
    await pyodide.runPython(`
import time
from pyodide.ffi import create_proxy

def step():
    """Move player forward"""
    if gameControllerReady:
        return callGameMethodSync('moveForward')
    else:
        print("Game not ready yet")
        return None

def left():
    """Turn player left"""
    if gameControllerReady:
        return callGameMethodSync('turnLeft')
    else:
        print("Game not ready yet")
        return None

def right():
    """Turn player right"""
    if gameControllerReady:
        return callGameMethodSync('turnRight')
    else:
        print("Game not ready yet")
        return None

def toggle():
    """Use/interact with items"""
    if gameControllerReady:
        return callGameMethodSync('useAction')
    else:
        print("Game not ready yet")
        return None

def sleep(seconds):
    """Sleep function that works in web worker"""
    import time
    time.sleep(seconds)

print("Game controller functions ready!")
print("Available commands: step(), left(), right(), toggle(), sleep()")
print("Note: These functions are blocking/synchronous and return actual values!")
    `);
    
    postMessage({ type: 'ready', message: 'Pyodide initialized! Game controller ready.\n' });
  } catch (error) {
    postMessage({ type: 'error', message: `Failed to load Pyodide: ${error.message}\n` });
  }
}

// Handle messages from main thread
onmessage = async function(e) {
  const { type, data } = e.data;
  
  switch (type) {
    case 'init':
      await initPyodide();
      break;
      
    case 'setGameController':
      gameControllerReady = true;
      if (pyodide) {
        pyodide.globals.set("gameControllerReady", gameControllerReady);
      }
      break;
      
    case 'runCode':
      if (!pyodide) {
        postMessage({ type: 'error', message: 'Pyodide not loaded yet. Please wait...\n' });
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
        
        // Check if the code contains explicit await expressions (but not our game functions)
        if (code.includes('await') && !code.match(/^(step|left|right|toggle|sleep)\(\)$/)) {
          // Only wrap in async if there are explicit await calls
          const asyncCode = `
async def _temp_async_func():
${code.split('\n').map(line => '    ' + line).join('\n')}
    
import asyncio
result = await _temp_async_func()
result
          `;
          result = await pyodide.runPythonAsync(asyncCode);
        } else {
          // Run synchronous code - this includes our game functions
          result = pyodide.runPython(code);
        }
        
        // Get stdout output
        const output = pyodide.runPython(`
output = sys.stdout.getvalue()
sys.stdout = old_stdout
output
        `);
        
        postMessage({ 
          type: 'result', 
          data: { 
            output: output || '', 
            result: result !== undefined && result !== null ? String(result) : null 
          } 
        });
        
      } catch (error) {
        postMessage({ type: 'error', message: `Error: ${error.message}\n` });
      }
      break;
  }
};
