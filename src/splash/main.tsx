// The ChrisXP loading screen on its own, for working on it without the BIOS boot or the desktop.
// Open /splash.html; it replays whenever the loader finishes or Enter is pressed.
import ReactDOM from 'react-dom/client';
import ChrisXPLoadingScreen from '../components/ChrisXPLoadingScreen';
import '../index.css';

const root = ReactDOM.createRoot(document.getElementById('root')!);
let run = 0;
const play = () => root.render(<ChrisXPLoadingScreen key={run++} onComplete={() => setTimeout(play, 600)} />);
play();
