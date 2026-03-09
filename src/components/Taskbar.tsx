import { useState, useEffect } from 'react';
import { useWindowStore } from '../store/windowStore';
import StartMenu from './StartMenu';

export default function Taskbar() {
  const { windows, minimizeWindow, restoreWindow, focusWindow } = useWindowStore();
  const [showStart, setShowStart] = useState(false);
  const [startFocused, setStartFocused] = useState(false);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (d: Date) =>
    d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const handleWindowBtn = (id: string, minimized: boolean) => {
    if (minimized) {
      restoreWindow(id);
      focusWindow(id);
    } else {
      minimizeWindow(id);
    }
  };

  const raisedShadow = 'inset -1px -1px 0 0 #0a0a0a, inset 1px 1px 0 0 #dfdfdf, inset -2px -2px 0 0 #808080, inset 2px 2px 0 0 white';
  const pressedShadow = 'inset -1px -1px 0 0 white, inset 1px 1px 0 0 #0a0a0a, inset -2px -2px 0 0 #dfdfdf, inset 2px 2px 0 0 #808080';

  return (
    <>
      {showStart && <StartMenu onClose={() => setShowStart(false)} />}
      <div
        style={{
          background: '#b8c0c1',
          display: 'flex',
          alignItems: 'center',
          padding: '3px',
          flexShrink: 0,
          boxShadow: 'inset -1px -1px 0 0 #0a0a0a, inset 1px 1px 0 0 #dfdfdf, inset -2px -2px 0 0 #808080, inset 2px 2px 0 0 white',
          position: 'relative',
          zIndex: 9999,
          gap: 2,
        }}
      >
        {/* Start button — Default / Pressed / Focused states */}
        {startFocused && !showStart ? (
          // Focused state
          <div
            role="button"
            tabIndex={0}
            onClick={() => setShowStart((s) => !s)}
            onFocus={() => setStartFocused(true)}
            onBlur={() => setStartFocused(false)}
            style={{
              padding: '3px',
              background: '#c0c0c0',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: 23,
              boxShadow: raisedShadow,
              flexShrink: 0,
              position: 'relative',
              outline: 'none',
            }}
          >
            <div style={{
              border: '1px dashed #000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 48,
              height: '100%',
              gap: 4,
              padding: '0 2px',
            }}>
              <img src="/windows-logo.png" alt="" style={{ width: 16, height: 16 }} />
              <span style={{ fontSize: 11, fontFamily: "'MS Sans Serif Bold', 'MS Sans Serif', Tahoma, sans-serif", fontWeight: 'bold', color: '#000', whiteSpace: 'nowrap' }}>Start</span>
            </div>
          </div>
        ) : (
          // Default / Pressed state
          <div
            role="button"
            tabIndex={0}
            onClick={() => setShowStart((s) => !s)}
            onFocus={() => setStartFocused(true)}
            onBlur={() => setStartFocused(false)}
            style={{
              padding: '3px 4px',
              background: '#b8c0c1',
              color: '#000',
              fontSize: 11,
              fontFamily: "'MS Sans Serif Bold', 'MS Sans Serif', Tahoma, sans-serif",
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              boxShadow: showStart ? pressedShadow : raisedShadow,
              flexShrink: 0,
              position: 'relative',
              outline: 'none',
              userSelect: 'none',
            }}
          >
            <img src="/windows-logo.png" alt="" style={{ width: 16, height: 16 }} />
            Start
          </div>
        )}

        {/* Window buttons */}
        <div style={{ flex: 1, display: 'flex', gap: 2, overflow: 'hidden' }}>
          {windows.map((win) => (
            <button
              key={win.id}
              onClick={() => handleWindowBtn(win.id, win.minimized)}
              style={{
                height: 23,
                padding: '0 6px',
                maxWidth: 160,
                background: '#b8c0c1',
                border: 'none',
                color: '#000',
                fontSize: 11,
                fontFamily: "'MS Sans Serif', Tahoma, sans-serif",
                cursor: 'pointer',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                textAlign: 'left',
                boxShadow: win.minimized ? pressedShadow : raisedShadow,
              }}
            >
              {win.title}
            </button>
          ))}
        </div>

        {/* Tray area */}
        <div style={{ display: 'flex', gap: 3, alignItems: 'center', flexShrink: 0 }}>
          {/* Divider */}
          <img src="/tray-divider.png" alt="" style={{ width: 2, height: 23 }} />
          {/* Clock + speaker */}
          <div
            style={{
              background: '#c0c0c0',
              boxShadow: 'inset -1px -1px 0 0 #dfdfdf, inset 1px 1px 0 0 #808080',
              padding: '4px 3px',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              height: 23,
              cursor: 'default',
              flexShrink: 0,
            }}
          >
            <img src="/speaker.png" alt="" style={{ width: 16, height: 16 }} />
            <span style={{ fontSize: 11, fontFamily: "'MS Sans Serif', Tahoma, sans-serif", whiteSpace: 'nowrap' }}>
              {formatTime(time)}
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
