import { useEffect, useEffectEvent, useRef, useState } from 'react';

interface BootLine {
  kind: 'line';
  key: string;
  start: number;
  text: string;
}

interface BootCounter {
  kind: 'counter';
  key: string;
  start: number;
  end: number;
  label: string;
  values: number[];
}

interface BootCheckRow {
  kind: 'check';
  key: string;
  start: number;
  resolve: number;
  label: string;
  result: string;
}

type BootRow = BootLine | BootCounter | BootCheckRow;

interface BootSequenceProps {
  onComplete: () => void;
}

const BIOS_DESIGN_WIDTH = 1414;
const BIOS_DESIGN_HEIGHT = 785;
const TOTAL_DURATION_MS = 4800;
const REDUCED_MOTION_HOLD_MS = 600;
const SKIP_SHOW_MS = 120;
const SKIP_AVAILABLE_MS = 300;

const HEADER_LINES: BootLine[] = [
  { kind: 'line', key: 'title', start: 150, text: 'Award Modular BIOS v4' },
  { kind: 'line', key: 'copyright', start: 320, text: 'Copyright (C) 1984-98' },
];

const SYSTEM_ROWS: BootRow[] = [
  { kind: 'line', key: 'version', start: 760, text: 'Version CHRISXP-0410' },
  { kind: 'line', key: 'cpu', start: 980, text: 'PENTIUM III CPU at 733MHz' },
  { kind: 'line', key: 'bus', start: 1160, text: 'PCI BUS at 33MHz' },
  {
    kind: 'counter',
    key: 'memory',
    start: 1600,
    end: 2700,
    label: 'Memory Test :',
    values: [0, 1024, 4096, 8192, 16384, 24576, 32768, 49152, 57344, 64000, 65536],
  },
  {
    kind: 'line',
    key: 'pnp',
    start: 2750,
    text: 'Award Plug and Play BIOS Extension   v1.0A',
  },
  {
    kind: 'line',
    key: 'award',
    start: 3000,
    text: 'Copyright (C) 1997, Award Software, Inc.',
  },
  {
    kind: 'check',
    key: 'portfolio',
    start: 3175,
    resolve: 3360,
    label: '  Detecting Portfolio Shell',
    result: 'OK',
  },
  {
    kind: 'check',
    key: 'terminal',
    start: 3475,
    resolve: 3660,
    label: '  Detecting Terminal Module',
    result: 'OK',
  },
  {
    kind: 'check',
    key: 'winamp',
    start: 3775,
    resolve: 3960,
    label: '  Detecting Winamp Module',
    result: 'OK',
  },
  {
    kind: 'check',
    key: 'diablo',
    start: 4075,
    resolve: 4200,
    label: '  Detecting Diablo Launcher',
    result: 'OK',
  },
];

const FOOTER_LINES = [
  { key: 'setup', start: 4200 },
  { key: 'boot', start: 4380 },
] as const;

const formatMemoryValue = (elapsed: number, item: BootCounter) => {
  if (elapsed >= item.end) {
    return `${item.values[item.values.length - 1]}K OK`;
  }

  const progress = Math.max(0, elapsed - item.start) / (item.end - item.start);
  const index = Math.min(
    item.values.length - 1,
    Math.floor(progress * (item.values.length - 1))
  );

  return `${item.values[index]}K`;
};

const formatCheckSuffix = (elapsed: number, item: BootCheckRow) => {
  if (elapsed >= item.resolve) {
    return `... ${item.result}`;
  }

  const phase = Math.floor((elapsed - item.start) / 70) % 4;
  return '.'.repeat(Math.max(1, phase));
};

const getViewportScale = () => {
  const widthScale = window.innerWidth / BIOS_DESIGN_WIDTH;
  const heightScale = window.innerHeight / BIOS_DESIGN_HEIGHT;
  return Math.max(0.72, Math.min(1.38, widthScale, heightScale));
};

export default function BootSequence({ onComplete }: BootSequenceProps) {
  const [elapsed, setElapsed] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(() =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  const [paused, setPaused] = useState(false);
  const [scale, setScale] = useState(1);
  const completedRef = useRef(false);
  const skipQueuedRef = useRef(false);
  const completionTimeoutRef = useRef<number | null>(null);
  const elapsedRef = useRef(0);

  const completeBoot = useEffectEvent(() => {
    if (completedRef.current) {
      return;
    }

    completedRef.current = true;
    onComplete();
  });

  const scheduleCompletion = useEffectEvent((delay: number) => {
    if (completionTimeoutRef.current !== null) {
      window.clearTimeout(completionTimeoutRef.current);
    }

    completionTimeoutRef.current = window.setTimeout(() => {
      completeBoot();
    }, delay);
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const applyPreference = () => setReducedMotion(mediaQuery.matches);
    mediaQuery.addEventListener('change', applyPreference);

    return () => mediaQuery.removeEventListener('change', applyPreference);
  }, []);

  useEffect(() => {
    const updateScale = () => setScale(getViewportScale());

    updateScale();
    window.addEventListener('resize', updateScale);

    return () => window.removeEventListener('resize', updateScale);
  }, []);

  useEffect(() => {
    elapsedRef.current = elapsed;
  }, [elapsed]);

  useEffect(() => {
    return () => {
      if (completionTimeoutRef.current !== null) {
        window.clearTimeout(completionTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!reducedMotion || completedRef.current) {
      return;
    }

    scheduleCompletion(REDUCED_MOTION_HOLD_MS);
  }, [reducedMotion]);

  useEffect(() => {
    if (reducedMotion || paused || completedRef.current || elapsedRef.current >= TOTAL_DURATION_MS) {
      return;
    }

    let frameId = 0;
    let lastTimestamp = performance.now();

    const tick = (timestamp: number) => {
      const delta = timestamp - lastTimestamp;
      lastTimestamp = timestamp;

      const nextElapsed = Math.min(TOTAL_DURATION_MS, elapsedRef.current + delta);
      elapsedRef.current = nextElapsed;
      setElapsed(nextElapsed);

      if (nextElapsed >= TOTAL_DURATION_MS) {
        scheduleCompletion(skipQueuedRef.current ? SKIP_SHOW_MS : 0);
        return;
      }

      frameId = window.requestAnimationFrame(tick);
    };

    frameId = window.requestAnimationFrame(tick);

    return () => window.cancelAnimationFrame(frameId);
  }, [paused, reducedMotion]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (completedRef.current) {
        return;
      }

      if (event.code === 'Space') {
        if (reducedMotion || elapsedRef.current >= TOTAL_DURATION_MS) {
          return;
        }

        event.preventDefault();
        setPaused((currentPaused) => !currentPaused);
        return;
      }

      if (event.key !== 'Enter' || skipQueuedRef.current) {
        return;
      }

      if (!reducedMotion && elapsedRef.current < SKIP_AVAILABLE_MS) {
        return;
      }

      event.preventDefault();
      skipQueuedRef.current = true;
      setPaused(false);
      elapsedRef.current = TOTAL_DURATION_MS;
      setElapsed(TOTAL_DURATION_MS);
      scheduleCompletion(SKIP_SHOW_MS);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [reducedMotion]);

  const renderElapsed = reducedMotion ? TOTAL_DURATION_MS : elapsed;
  const showFooter = renderElapsed >= FOOTER_LINES[0].start;
  const showBootPrompt = renderElapsed >= FOOTER_LINES[1].start;
  const showCursor = showBootPrompt && renderElapsed < TOTAL_DURATION_MS && !paused;
  const biosAssetBase = `${import.meta.env.BASE_URL}bios/`;
  const textStyle = {
    color: '#808080',
    fontFamily: '"Perfect DOS VGA 437 Win", "Lucida Console", "Courier New", monospace',
    fontSize: Math.round(33 * scale),
    lineHeight: `${Math.round(30 * scale)}px`,
    letterSpacing: 0,
    whiteSpace: 'pre' as const,
    fontVariantLigatures: 'none' as const,
  };
  const layoutStyles = {
    paddingTop: Math.round(32 * scale),
    paddingLeft: Math.round(32 * scale),
    paddingRight: Math.round(36 * scale),
    paddingBottom: Math.round(28 * scale),
  };
  const logoWidth = Math.round(380 * scale);
  const logoHeight = Math.round(261 * scale);
  const iconWidth = Math.round(44 * scale);
  const iconHeight = Math.round(66 * scale);
  const contentMaxWidth = Math.round(1080 * scale);

  return (
    <div className="bios-screen">
      <div className="bios-screen__scanlines" />

      <div className="bios-screen__content" style={layoutStyles}>
        <img
          src={`${biosAssetBase}epa-logo.png`}
          alt=""
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: layoutStyles.paddingTop,
            right: layoutStyles.paddingRight,
            width: logoWidth,
            height: logoHeight,
            imageRendering: 'pixelated',
          }}
        />

        <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: Math.round(22 * scale),
              maxWidth: contentMaxWidth,
            }}
          >
            {renderElapsed >= HEADER_LINES[0].start ? (
              <img
                src={`${biosAssetBase}bios-icon.png`}
                alt=""
                aria-hidden="true"
                style={{
                  width: iconWidth,
                  height: iconHeight,
                  marginTop: Math.round(2 * scale),
                  imageRendering: 'pixelated',
                }}
              />
            ) : null}

            <div style={{ display: 'flex', flexDirection: 'column', gap: Math.round(4 * scale) }}>
              {HEADER_LINES.map((line) =>
                renderElapsed >= line.start ? (
                  <div key={line.key} style={textStyle}>
                    {line.text}
                  </div>
                ) : null
              )}
            </div>
          </div>

          <div
            style={{
              marginTop: Math.round(62 * scale),
              display: 'flex',
              flexDirection: 'column',
              gap: Math.round(8 * scale),
              maxWidth: contentMaxWidth,
            }}
          >
            {SYSTEM_ROWS.map((item) => {
              if (renderElapsed < item.start) {
                return null;
              }

              if (item.kind === 'line') {
                return (
                  <div key={item.key} style={textStyle}>
                    {item.text}
                  </div>
                );
              }

              if (item.kind === 'counter') {
                return (
                  <div key={item.key} style={textStyle}>
                    {`${item.label} ${formatMemoryValue(renderElapsed, item)}`}
                  </div>
                );
              }

              return (
                <div key={item.key} style={textStyle}>
                  {`${item.label} ${formatCheckSuffix(renderElapsed, item)}`}
                </div>
              );
            })}
          </div>

          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              maxWidth: contentMaxWidth,
            }}
          >
            {showFooter ? (
              <div style={textStyle}>
                Press <span style={{ color: '#dfdfdf' }}>DEL</span> to enter SETUP
              </div>
            ) : null}

            {showBootPrompt ? (
              <div style={{ ...textStyle, marginTop: Math.round(6 * scale) }}>
                Press <span style={{ color: '#dfdfdf' }}>ENTER</span> to boot CHRISXP
                {showCursor ? <span className="bios-screen__cursor">_</span> : null}
              </div>
            ) : null}

            {paused ? (
              <div style={{ ...textStyle, marginTop: Math.round(12 * scale) }}>
                Press <span style={{ color: '#dfdfdf' }}>SPACE</span> to resume
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
