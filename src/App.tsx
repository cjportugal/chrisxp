import { useState } from 'react';
import AsciiBootTransition from './components/AsciiBootTransition';
import BootSequence from './components/BootSequence';
import ChrisXPLoadingScreen from './components/ChrisXPLoadingScreen';
import Desktop from './components/Desktop';
import DesktopReveal from './components/DesktopReveal';

type BootPhase = 'bios' | 'transition' | 'readme' | 'desktop-reveal' | 'complete';

function App() {
  const [bootPhase, setBootPhase] = useState<BootPhase>('bios');

  return <>
    {(bootPhase === 'desktop-reveal' || bootPhase === 'complete') && (
      <div className="desktop-stage" inert={bootPhase !== 'complete'}><Desktop /></div>
    )}
    {bootPhase !== 'complete' && (
      <div className="boot-readme-layer" inert={bootPhase !== 'readme'} aria-hidden={bootPhase !== 'readme'}>
        <ChrisXPLoadingScreen active={bootPhase === 'readme'} onComplete={() => setBootPhase('desktop-reveal')} />
      </div>
    )}
    {(bootPhase === 'bios' || bootPhase === 'transition') && (
      <div className="boot-bios-layer" aria-hidden={bootPhase === 'transition'}>
        <BootSequence onComplete={() => setBootPhase('transition')} />
      </div>
    )}
    {bootPhase === 'transition' && <AsciiBootTransition onComplete={() => setBootPhase('readme')} />}
    {bootPhase === 'desktop-reveal' && <DesktopReveal onComplete={() => setBootPhase('complete')} />}
  </>;
}

export default App;
