import React, { useCallback, useEffect, useState } from 'react';
import PythonConsole from './components/PythonConsole';

const App: React.FC = () => {
  const [pythonReady, setPythonReady] = useState(false);
  const [outputHistory, setOutputHistory] = useState<string[]>([]);
  const [keys, setKeys] = useState<number | null>(null);
  const [messages, setMessages] = useState<string>('');


  useEffect(() => {
    if (messages) {
      const timer = setTimeout(() => setMessages(''), 2000);
      return () => clearTimeout(timer);
    }
  }, [messages, setMessages]);
  const handlePythonReady = useCallback(() => {
    console.log('Python REPL is ready!');
    setPythonReady(true);
  }, [setPythonReady]);

  const handlePythonOutput = useCallback((text: string) => {
    setOutputHistory(prev => [...prev, text]);
  }, [setOutputHistory]);

  const handlePythonError = useCallback((error: string) => {
    console.error('Python REPL error:', error);
  }, []);

  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const panelRef = React.useRef<HTMLDivElement | null>(null);

  const services = React.useMemo(() => ({
    updateKeys: (newKeys: number) => setKeys(newKeys),
    alert: (message: string) => setMessages(message)
  }), [setKeys, setMessages]);
  return (
    <>
      <div className="game-panel" ref={panelRef}>
        <div className="hud">
          <div className="hud-title">Items</div>
          <div className="keys-container">{
            keys === null ? '' : keys === 0 ? (
              <div style={{ color: '#666', fontStyle: 'italic', fontSize: '12px' }}>Empty</div>
            ) : (
              <div style={{ display: 'flex' }}><img width={30} src="/assets/models/key.png" />{keys}</div>
            )
          }</div>
        </div>
        <div className='banner' style={{ display: messages ? 'block' : 'none' }}>{messages}</div>
        <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }}></canvas>
      </div>

      <PythonConsole
        onReady={handlePythonReady}
        onOutput={handlePythonOutput}
        onError={handlePythonError}
        canvasRef={canvasRef}
        panelRef={panelRef}
        services={services}
      />
    </>
  );
};

export default App;