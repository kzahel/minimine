import React, { useEffect, useRef } from 'react';
import { Engine } from './core/Engine';
import { Overlay } from './ui/Overlay';

function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const [engine, setEngine] = React.useState<Engine | null>(null);

  useEffect(() => {
    if (containerRef.current && !engineRef.current) {
      console.log("Creating new Engine");
      engineRef.current = new Engine(containerRef.current);
      engineRef.current.start();
      setEngine(engineRef.current);
    }

    return () => {
      if (engineRef.current) {
        console.log("Disposing Engine");
        engineRef.current.dispose();
        engineRef.current = null;
        setEngine(null);
      }
    };
  }, []);

  return (
    <div className="App">
      <div ref={containerRef} style={{ width: '100vw', height: '100vh' }} />
      {engine && <Overlay engine={engine} />}
    </div>
  );
}

export default App;
