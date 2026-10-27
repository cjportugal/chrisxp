import { useEffect, useState } from 'react';
import art from '../chrisxp-art/chrisxp-80.txt?raw';

// Trim the blank rows and the common left margin so the art fills the box edge to edge.
const RAW_LINES = art.replace(/\s+$/, '').split('\n');
const INDENT = Math.min(...RAW_LINES.filter((line) => line.trim()).map((line) => line.length - line.trimStart().length));
const ART_LINES = RAW_LINES.map((line) => line.slice(INDENT).trimEnd());

function formatUptime(ms: number): string {
  const total = Math.floor(ms / 1000);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${hours}:${pad(minutes)}:${pad(seconds)}`;
}

function useUptime(): string {
  const [now, setNow] = useState(() => performance.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(performance.now()), 1000);
    return () => clearInterval(interval);
  }, []);
  return formatUptime(now);
}

/** The System 1 "About the Finder" box, ChrisXP flavored. Nothing here is real except the clock. */
export default function About() {
  const uptime = useUptime();

  return (
    <div className="cx-about cx-ui">
      <pre className="cx-about__art cx-mono" aria-label="ChrisXP">
        {ART_LINES.join('\n')}
      </pre>
      <div className="cx-about__title">
        <span className="cx-about__name">ChrisXP 1.0</span>
        <span>Soft club edition</span>
      </div>
      <div className="cx-about__rule" />
      <dl className="cx-about__facts">
        <dt>Built-in Memory:</dt>
        <dd>640K</dd>
        <dt>Largest Unused Block:</dt>
        <dd>4,096K</dd>
        <dt>Up since boot:</dt>
        <dd>{uptime}</dd>
      </dl>
      <div className="cx-about__footer">© 1984–2026 Chris. All rights reversed.</div>
    </div>
  );
}
