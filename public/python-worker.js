// Web Worker for running Python code with Pyodide
let pyodide = null;
let gameControllerReady = false;

// Helper function to call game methods via message passing
async function callGameMethod(method, ...args) {
  return new Promise((resolve) => {
    const messageId = Math.random().toString(36).substr(2, 9);
    
    // Set up listener for response
    const responseHandler = (e) => {
      if (e.data.type === 'gameMethodResult' && e.data.messageId === messageId) {
        self.removeEventListener('message', responseHandler);
        resolve(e.data.result);
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
  });
}

// Load Pyodide in the worker
async function initPyodide() {
  try {
    importScripts('https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js');
    pyodide = await loadPyodide();
    
    // Make the game method caller available globally
    pyodide.globals.set("callGameMethod", callGameMethod);
    
    // Define Python functions that call game methods
    await pyodide.runPython(`
import asyncio
import time
from pyodide.ffi import create_proxy

async def step():
    """Move player forward"""
    if gameControllerReady:
        await callGameMethod('moveForward')
    else:
        print("Game not ready yet")

async def left():
    """Turn player left"""
    if gameControllerReady:
        await callGameMethod('turnLeft')
    else:
        print("Game not ready yet")

async def right():
    """Turn player right"""
    if gameControllerReady:
        await callGameMethod('turnRight')
    else:
        print("Game not ready yet")

async def toggle():
    """Use/interact with items"""
    if gameControllerReady:
        await callGameMethod('useAction')
    else:
        print("Game not ready yet")

def sleep(seconds):
    """Sleep function that works in web worker"""
    import time
    time.sleep(seconds)

print("Game controller functions ready!")
print("Available commands: step(), left(), right(), toggle(), sleep()")
print("Note: These are async functions, use 'await' or run with asyncio.create_task()")
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
        
        // Check if the code contains await expressions or game functions
        if (code.includes('await') || code.includes('step()') || code.includes('left()') || 
            code.includes('right()') || code.includes('toggle()') || code.includes('sleep(')) {
          // Wrap the code in an async function and run it
          const asyncCode = `
async def _temp_async_func():
${code.split('\n').map(line => '    ' + line).join('\n')}
    
import asyncio
result = await _temp_async_func()
result
          `;
          result = await pyodide.runPythonAsync(asyncCode);
        } else {
          // Run synchronous code normally
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
