import { useState } from 'react';
import BootSequence from './components/BootSequence';
import Desktop from './components/Desktop';

function App() {
  const [bootPhase, setBootPhase] = useState<'bios' | 'complete'>('bios');

  if (bootPhase === 'bios') {
    return <BootSequence onComplete={() => setBootPhase('complete')} />;
  }

  return <Desktop />;
}

export default App;
