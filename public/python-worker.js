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

def help():
    """Explain how this playground works"""
    print("""How this playground works
=========================

Type Python and press Enter to run it.
If a block is unfinished (def, if, while, or for still needs a body),
Enter adds another line instead of running. Arrow up and down recall
earlier commands.

Functions you define are saved in this browser and restored next visit.
Call help() any time to see this guide again.

Levels
------
level('name')    load a level
level('?')       list levels in the current collection
levels('name')   switch collection: basics or blockly
levels('?')      list collections
restart()        start the current level over

Maze commands
-------------
A level may only allow some of these. The welcome line lists the ones
you can use. Calling one that is locked raises an error.

step()           walk one cell forward, in the direction you face
left()           turn left
right()          turn right
toggle()         use what you are standing on, or what is in front of you
safe()           True if the cell ahead is safe to enter right now
notDone()        True until you reach the exit or the player is gone
check('next')    same as safe()
check('left')    True if the cell to your left is safe
check('right')   True if the cell to your right is safe
sleep(seconds)   pause

Reach the glowing exit to win.
After a win or a death, call restart() or level('name').

The maze
--------
Walls block you. Empty floor is open.

Keys: walk onto a key to pick it up. It is counted in the Items panel.
Locked doors: stand facing the door and call toggle() while you hold a key.
  One key opens one door. Without a key, toggle() tells you so.
  step() into a closed door fails until it is open.

Boxes: step() into a box pushes it one cell forward.
  The cell beyond must be empty. A wall, door, or another box blocks the push.
  Pushing a box into lava destroys the box and that lava.

Buttons: stand on the button, face the way it points, then toggle().
  That press opens every automatic door and starts numbered lava.
  Doors stay open for a few seconds, then close. Standing in a closing
  door crushes you. The button can be pressed again after it resets.

Lava:
  Orange lava is always deadly. step() onto it ends the run.
  Numbered tiles 0 through 9 are timed. After a button press they take
  turns becoming safe: tile n is passable around moment n, then deadly
  again. Cross during its window and leave before it returns.
  safe() and check() are False for deadly lava, walls, and closed doors.

Code levels
-----------
Some levels have no maze. The console prints what to write.
Define the function they ask for; the level calls it and prints the result.
Example shapes you will meet:
  hi        define hi() and it prints a greeting
  nim       define a function (n, take). n is the pile. take(k) removes
            k pieces (only a legal amount). You and the AI alternate.
            Whoever takes the last piece wins.
  secret    define a function that receives check(guess). check returns
            1 if the secret is higher, -1 if lower, 0 if equal.
            Return the secret number. You have a limited number of tries.

Patterns
--------
Walk until you cannot:

    while safe():
        step()

Keep going until the exit, turning when blocked:

    while notDone():
        if safe():
            step()
        else:
            left()

Give a sequence a name so you can reuse it:

    def forward(n):
        for i in range(n):
            step()
""")
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
