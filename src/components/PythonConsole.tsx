import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { PythonREPL, Services } from '../python-repl';

interface PythonConsoleProps {
  onReady: () => void;
  onOutput: (text: string) => void;
  onError: (error: string) => void;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  panelRef: React.RefObject<HTMLDivElement | null>;
  services: Services;

}

interface ConsoleEntry {
  type: 'system' | 'input' | 'output' | 'error';
  text: string;
  color: string;
}

const PythonConsole: React.FC<PythonConsoleProps> = ({
  onReady,
  onOutput,
  onError,
  canvasRef,
  panelRef,
  services
}) => {
  const pythonReplRef = useRef<PythonREPL | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const consoleContainerRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);
  const [consoleEntries, setConsoleEntries] = useState<ConsoleEntry[]>([
    { type: 'system', text: 'Python 3.11.0 (WebAssembly) - Loading...', color: '#FFC107' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const scrollToBottom = useCallback(() => {
    if (consoleContainerRef.current) {
      consoleContainerRef.current.scrollTo({
        top: consoleContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, []);

  const addConsoleEntry = useCallback((entry: ConsoleEntry): void => {
    setConsoleEntries(prev => [...prev, entry]);
    if (entry.type === 'output') {
      onOutput(entry.text);
    } else if (entry.type === 'error') {
      onError(entry.text);
    }
    // Scroll to bottom after updating console output
    setTimeout(scrollToBottom, 0);
  }, [onOutput, onError, scrollToBottom]);

  const updateConsole = useCallback((text: string): void => {
    addConsoleEntry({ type: 'output', text, color: '#d4d4d4' });
  }, [addConsoleEntry]);

  const executeCode = useCallback((code: string): void => {
    console.log({code})
    if (pythonReplRef.current && code.trim()) {
      // Add command to history
      setCommandHistory(prev => {
        const newHistory = [...prev, code];
        // Keep only last 50 commands to prevent memory issues
        return newHistory.slice(-50);
      });
      
      // Reset history index
      setHistoryIndex(-1);
      
      // Add the input to console entries
      addConsoleEntry({ type: 'input', text: `${code}`, color: '#4CAF50' });
      // Execute the code
      pythonReplRef.current.executeCode(code);
      // Clear the input
      setInputValue('');
    }
  }, [addConsoleEntry]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      
      const code = inputValue
      if (code) {
        // Use Pyodide's Console class to check code completion
        if (pythonReplRef.current) {
          pythonReplRef.current.checkCodeCompletion(code, (status) => {
            console.log('Code completion status:', status);
            if (status === 'complete') {
              return executeCode(code);
            } else if (status === 'syntax-error') {
              // Let Python handle the syntax error by executing it
              return executeCode(code);
            }
            // If 'incomplete', add a newline and continue editing
            setInputValue(prev => prev + '\n');
          });
        }
      } else {
        setInputValue('');
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      // Navigate to previous command in history
      if (commandHistory.length > 0) {
        const newIndex = historyIndex === -1 ? commandHistory.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(newIndex);
        setInputValue(commandHistory[newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      // Navigate to next command in history
      if (historyIndex >= 0) {
        if (historyIndex === commandHistory.length - 1) {
          // At the end of history, clear input
          setHistoryIndex(-1);
          setInputValue('');
        } else {
          const newIndex = historyIndex + 1;
          setHistoryIndex(newIndex);
          setInputValue(commandHistory[newIndex]);
        }
      }
    }
  }, [inputValue, executeCode, commandHistory, historyIndex]);

  // Initialize Python REPL when component mounts - only once
  useEffect(() => {
    if (pythonReplRef.current) {
      return; // Already initialized
    }

    const handlers = {
      onError: (error: string) => {
        addConsoleEntry({ type: 'error', text: error, color: '#f44336' });
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

    pythonReplRef.current = new PythonREPL(handlers, () => canvasRef.current, () => panelRef.current, services);

    return () => {
      if (pythonReplRef.current) {
        pythonReplRef.current.dispose();
        pythonReplRef.current = null;
      }
    };
  }, [addConsoleEntry, updateConsole, onReady, canvasRef, services]);

  // Update ready status
  useEffect(() => {
    if (isReady) {
      setConsoleEntries(prev =>
        prev.map(entry =>
          entry.text.includes('Loading...')
            ? { ...entry, text: 'Python 3.11.0 (WebAssembly) - Ready! Type your Python code below and press Enter to execute.', color: '#4CAF50' }
            : entry
        )
      );
      setTimeout(scrollToBottom, 0);
    }
  }, [isReady, scrollToBottom]);

  // Also scroll to bottom when console entries change
  useEffect(() => {
    scrollToBottom();
  }, [consoleEntries, scrollToBottom]);

  const lines = useMemo(() => Math.max(1, inputValue.split('\n').length), [inputValue]);

  // Focus textarea when clicking in the input area
  const handleInputAreaClick = useCallback(() => {
    if (textareaRef.current && isReady) {
      textareaRef.current.focus();
    }
  }, [isReady]);

  // Auto-focus textarea when ready
  useEffect(() => {
    if (isReady && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isReady]);

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
        {consoleEntries.map((entry, index) => (
          <span key={index} style={{ color: entry.color }} className={`console-${entry.type}`}>
            {entry.text.split('\n').map((line, i, a) => (<span key={i}>{line}{i === a.length - 1 ? '' : '\n'}</span>))}
          </span>
        ))}
      </div>
      <div 
        style={{ display: 'flex', alignItems: 'flex-start', gap: 2, cursor: 'text' }}
        onClick={handleInputAreaClick}
      >
        <div className='console-input'>
          {Array.from({ length: lines }, (_, i) => <div key={i} />)}
        </div>
        <textarea
          ref={textareaRef}
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={!isReady ? "Loading Python..." : ""}
          disabled={!isReady}
          autoFocus={isReady}
          spellCheck={false}
          style={{
            backgroundColor: 'transparent',
            color: '#d4d4d4',
            fontFamily: 'Consolas, "Courier New", monospace',
            fontSize: '14px',
            border: 'none',
            outline: 'none',
            resize: 'none',
            width: '100%',
            height: `${lines * 17 + 20}px`,
            padding: '0',
            margin: '0',
            overflow: 'hidden'
          }}
        />
      </div>
      <div style={{ height: '50%', cursor: 'text' }} onClick={handleInputAreaClick} />
    </div>
  );
};

export default PythonConsole;