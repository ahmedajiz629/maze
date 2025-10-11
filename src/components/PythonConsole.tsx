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
  const consoleContainerRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);
  const [consoleOutput, setConsoleOutput] = useState('Python 3.11.0 (WebAssembly) - Loading...\n');
  const [inputValue, setInputValue] = useState('');

  const scrollToBottom = useCallback(() => {
    if (consoleContainerRef.current) {
      consoleContainerRef.current.scrollTo({
        top: consoleContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, []);

  const updateConsole = useCallback((text: string): void => {
    setConsoleOutput(prev => prev + text);
    onOutput(text);
    // Scroll to bottom after updating console output
    setTimeout(scrollToBottom, 0);
  }, [onOutput, scrollToBottom]);

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

  const handleInputChange = useCallback(async (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;

    // Check if there's a newline character
    const newlineIndex = value.indexOf('\n');
    if (newlineIndex !== -1) {
      const lines = value.split('\n');

      // If the new line is empty, check if we should execute
      if (lines[lines.length - 1] === '') {
        const codeToCheck = lines.slice(0, -1).join('\n');

        if (codeToCheck.trim()) {
          // Use Pyodide's Console class to check code completion
          if (pythonReplRef.current) {
            pythonReplRef.current.checkCodeCompletion(codeToCheck, (status) => {
              console.log('Code completion status:', status);
              if (status === 'complete') {
                return executeCode(codeToCheck);
              } else if (status === 'syntax-error') {
                // Let Python handle the syntax error by executing it
                return executeCode(codeToCheck);
              }
              // If 'incomplete', continue editing (do nothing)
            });
          }
        } else {
          return setInputValue('');
        }
      }
    }
    return setInputValue(value);
  }, [executeCode]);

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
      setTimeout(scrollToBottom, 0);
    }
  }, [isReady, scrollToBottom]);

  // Also scroll to bottom when console output changes
  useEffect(() => {
    scrollToBottom();
  }, [consoleOutput, scrollToBottom]);

  // Calculate textarea height based on number of lines
  const calculateTextareaHeight = () => {
    const lines = inputValue.split('\n').length;
    const lineHeight = 20; // Approximate line height in pixels
    const padding = 20; // Top and bottom padding
    const minHeight = lineHeight + padding; // At least one line
    return Math.max(minHeight, lines * lineHeight + padding);
  };

  return (
    <div
      ref={consoleContainerRef}
      className="python-console"
      style={{
        backgroundColor: '#1e1e1e',
        color: '#d4d4d4',
        fontFamily: 'Consolas, "Courier New", monospace',
        fontSize: '14px',
        padding: '10px',
        overflowY: 'auto',
        whiteSpace: 'pre-wrap',
        border: '1px solid #444',
        outline: 'none',
        flex: 1,
      }}
    >
      <div style={{ whiteSpace: 'pre-wrap' }}>
        {consoleOutput}
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-start' }}>
        <span style={{ color: '#4CAF50', marginRight: '4px' }}>{'>>> '}</span>
        <textarea
          ref={textareaRef}
          value={inputValue}
          onChange={handleInputChange}
          placeholder={!isReady ? "Loading Python..." : ""}
          disabled={!isReady}
          style={{
            backgroundColor: 'transparent',
            color: '#d4d4d4',
            fontFamily: 'Consolas, "Courier New", monospace',
            fontSize: '14px',
            border: 'none',
            outline: 'none',
            resize: 'none',
            width: '100%',
            height: `${calculateTextareaHeight()}px`,
            padding: '0',
            margin: '0',
            lineHeight: '20px',
            overflow: 'hidden'
          }}
        />
      </div>
      <div style={{ height: '50%' }} />
    </div>
  );
};

export default PythonConsole;