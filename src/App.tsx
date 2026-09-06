import { useState } from 'react';
import AsciiBootTransition from './components/AsciiBootTransition';
import BootSequence from './components/BootSequence';
import Desktop from './components/Desktop';
import DesktopReveal from './components/DesktopReveal';
import Windows95LoadingScreen from './components/Windows95LoadingScreen';

function App() {
  const [bootPhase, setBootPhase] = useState<'bios' | 'transition' | 'windows95' | 'desktop-reveal' | 'complete'>('bios');

  if (bootPhase === 'bios' || bootPhase === 'transition') {
    return <>
      <BootSequence onComplete={() => setBootPhase('transition')} />
      {bootPhase === 'transition' && <AsciiBootTransition onComplete={() => setBootPhase('windows95')} />}
    </>;
  }

  if (bootPhase === 'windows95') {
    return <Windows95LoadingScreen onComplete={() => setBootPhase('desktop-reveal')} />;
  }

  return <>
    <div inert={bootPhase === 'desktop-reveal'}><Desktop /></div>
    {bootPhase === 'desktop-reveal' && <DesktopReveal onComplete={() => setBootPhase('complete')} />}
  </>;
}

export default App;
