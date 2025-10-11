import React, { useEffect, useRef, useState, useCallback } from 'react';
import { PythonREPL, Services } from '../python-repl';

interface PythonConsoleProps {
  onReady: () => void;
  onOutput: (text: string) => void;
  onError: (error: string) => void;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  services: Services;

}

const PythonConsole: React.FC<PythonConsoleProps> = ({
  onReady,
  onOutput,
  onError,
  canvasRef,
  services
}) => {
  const pythonReplRef = useRef<PythonREPL | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isReady, setIsReady] = useState(false);
  const [consoleOutput, setConsoleOutput] = useState('Python 3.11.0 (WebAssembly) - Loading...\n');
  const [inputValue, setInputValue] = useState('');

  const updateConsole = useCallback((text: string): void => {
    setConsoleOutput(prev => prev + text);
    onOutput(text);
  }, [onOutput]);

  const executeCode = useCallback((code: string): void => {
    if (pythonReplRef.current && code.trim()) {
      // Add the input to console output
      setConsoleOutput(prev => prev + '>>> ' + code + '\n');
      // Execute the code
      pythonReplRef.current.executeCode(code);
      // Clear the input
      setInputValue('');
    }
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      executeCode(inputValue);
    }
  }, [inputValue, executeCode]);

  // Initialize Python REPL when component mounts - only once
  useEffect(() => {
    if (pythonReplRef.current) {
      return; // Already initialized
    }

    const handlers = {
      onError: (error: string) => {
        updateConsole(error + '\n');
        onError(error);
      },
      onOutput: updateConsole,
      onReady: () => {
        setIsReady(true);
        onReady();
      },
      onResult: () => {
        // Called when code execution completes
      }
    };

    pythonReplRef.current = new PythonREPL(handlers, () => canvasRef.current, services);

    return () => {
      if (pythonReplRef.current) {
        pythonReplRef.current.dispose();
        pythonReplRef.current = null;
      }
    };
  }, [updateConsole, onReady, onError, canvasRef, services]);

  // Update ready status
  useEffect(() => {
    if (isReady) {
      setConsoleOutput(prev => prev.replace('Loading...', 'Ready! Type your Python code below and press Enter to execute.'));
    }
  }, [isReady]);

  return (
    <div className="python-console">
      <div
        className="console-output"
        style={{
          backgroundColor: '#1e1e1e',
          color: '#d4d4d4',
          fontFamily: 'Consolas, "Courier New", monospace',
          fontSize: '14px',
          padding: '10px',
          height: '200px',
          overflowY: 'auto',
          whiteSpace: 'pre-wrap',
          border: '1px solid #444',
          marginBottom: '5px'
        }}
      >
        {consoleOutput}
      </div>
      <textarea
        ref={textareaRef}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={isReady ? "Type Python code here... (Enter to execute, Shift+Enter for new line)" : "Loading Python..."}
        disabled={!isReady}
        style={{
          width: '100%',
          height: '100px',
          backgroundColor: '#2d2d2d',
          color: '#d4d4d4',
          fontFamily: 'Consolas, "Courier New", monospace',
          fontSize: '14px',
          padding: '10px',
          border: '1px solid #444',
          resize: 'vertical',
          outline: 'none'
        }}
      />
    </div>
  );
};

export default PythonConsole;