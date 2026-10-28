import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { AudioEngine, probeDuration } from '../../audio/engine';
import { formatTime } from '../../audio/time';
import { usePlayerStore } from '../../store/playerStore';
import { useWindowStore } from '../../store/windowStore';
import { GLYPHS } from '../../theme/glyphs';
import type { PixelGlyph } from '../../theme/glyphs';
import { MENUBAR_HEIGHT, PLAYER_WIDTH } from '../../theme/layout';
import PixelIcon from '../PixelIcon';
import { panelKeyAction } from './keys';
import Playlist from './Playlist';
import Slider from './Slider';
import SpectrumBars from './SpectrumBars';
import Visualizer from './Visualizer';

const VOLUME_STEP = 0.05;

/** Winamp, as a ChrisXP column docked to the right edge. Owns the audio engine for as long as it is open.
 * While Milkdrop fills the desktop the column turns to a paper screen-door, so the visuals show through it. */
export default function PlayerPanel() {
  const closeWinamp = useWindowStore((state) => state.closeWinamp);
  const attachEngine = usePlayerStore((state) => state.attachEngine);
  const detachEngine = usePlayerStore((state) => state.detachEngine);
  const visOnDesktop = usePlayerStore((state) => state.visOnDesktop);

  useEffect(() => {
    attachEngine((events) => new AudioEngine(events));
    return detachEngine;
  }, [attachEngine, detachEngine]);

  useEffect(() => {
    const { tracks, durations, setDurations } = usePlayerStore.getState();
    if (durations.every(Number.isFinite)) return;
    void Promise.all(tracks.map((track) => probeDuration(track.url))).then(setDurations);
  }, []);

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    const action = panelKeyAction(event.key, (event.target as Element).closest('button') ? 'button' : 'panel');
    if (!action) return;
    event.preventDefault();
    const player = usePlayerStore.getState();
    if (action === 'togglePlay') void player.togglePlay();
    else if (action === 'prev') void player.prev();
    else if (action === 'next') void player.next();
    else player.setVolume(player.volume + (action === 'volumeUp' ? VOLUME_STEP : -VOLUME_STEP));
  };

  return (
    <aside
      className="cx-player cx-ui"
      aria-label="ChrisAMP"
      data-see-through={visOnDesktop ? 'true' : undefined}
      tabIndex={-1}
      style={{ top: MENUBAR_HEIGHT, width: PLAYER_WIDTH }}
      onKeyDown={onKeyDown}
    >
      <div className="cx-titlebar">
        <button type="button" className="cx-titlebar__box cx-titlebar__box--close" aria-label="Close ChrisAMP" onClick={closeWinamp}>
          <PixelIcon glyph={GLYPHS.closeBox} />
        </button>
        <span className="cx-titlebar__center">
          <span className="cx-titlebar__title">ChrisAMP</span>
        </span>
        <span className="cx-player__titlebar-spacer" />
      </div>
      <div className="cx-player__body">
        <Visualizer />
        <NowPlaying />
        <Transport />
        <Playlist />
      </div>
    </aside>
  );
}

function NowPlaying() {
  const track = usePlayerStore((state) => state.tracks[state.index]);
  const status = usePlayerStore((state) => state.status);
  const currentTime = usePlayerStore((state) => state.currentTime);
  const duration = usePlayerStore((state) => state.duration);
  const seek = usePlayerStore((state) => state.seek);
  const [remaining, setRemaining] = useState(false);

  const time = remaining ? formatTime(duration - currentTime, true) : formatTime(currentTime);

  return (
    <div className="cx-player__now">
      <div className="cx-player__readout">
        <button
          type="button"
          className="cx-player__time cx-mono"
          data-status={status}
          aria-label={remaining ? 'Time remaining; show elapsed' : 'Time elapsed; show remaining'}
          onClick={() => setRemaining((value) => !value)}
        >
          {time}
        </button>
        <SpectrumBars />
      </div>
      <Marquee text={track?.title ?? 'No tracks'} />
      <div className="cx-player__artist">{track?.artist || ' '}</div>
      <Slider
        label="Seek"
        value={currentTime}
        max={duration}
        step={5}
        disabled={duration === 0}
        valueText={`${formatTime(currentTime)} of ${formatTime(duration)}`}
        onChange={seek}
      />
    </div>
  );
}

/** The title, scrolling Winamp-style when it does not fit. */
function Marquee({ text }: { text: string }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [overflowing, setOverflowing] = useState(false);

  useLayoutEffect(() => {
    const box = boxRef.current;
    const label = textRef.current;
    if (!box || !label) return;
    const measure = () => setOverflowing(label.offsetWidth > box.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(box);
    return () => observer.disconnect();
  }, [text]);

  return (
    <div ref={boxRef} className="cx-player__title" data-marquee={overflowing ? 'true' : 'false'} title={text}>
      <span className="cx-player__title-run">
        <span ref={textRef}>{text}</span>
        {overflowing && <span aria-hidden="true">{'  ***  '}{text}{'  ***  '}</span>}
      </span>
    </div>
  );
}

function TransportButton({ glyph, label, onClick, pressed }: { glyph: PixelGlyph; label: string; onClick: () => void; pressed?: boolean }) {
  return (
    <button type="button" className="cx-button cx-player__icon-button" aria-label={label} title={label} aria-pressed={pressed} onClick={onClick}>
      <PixelIcon glyph={glyph} />
    </button>
  );
}

function Transport() {
  const status = usePlayerStore((state) => state.status);
  const volume = usePlayerStore((state) => state.volume);
  const shuffle = usePlayerStore((state) => state.shuffle);
  const repeat = usePlayerStore((state) => state.repeat);
  const { play, pause, stop, next, prev, setVolume, toggleShuffle, toggleRepeat } = usePlayerStore.getState();

  return (
    <div className="cx-player__transport">
      <div className="cx-player__buttons">
        <TransportButton glyph={GLYPHS.prev} label="Previous" onClick={() => void prev()} />
        <TransportButton glyph={GLYPHS.play} label="Play" pressed={status === 'playing'} onClick={() => void play()} />
        <TransportButton glyph={GLYPHS.pause} label="Pause" pressed={status === 'paused'} onClick={() => (status === 'paused' ? void play() : pause())} />
        <TransportButton glyph={GLYPHS.stop} label="Stop" onClick={stop} />
        <TransportButton glyph={GLYPHS.next} label="Next" onClick={() => void next()} />
      </div>
      <div className="cx-player__mix">
        <PixelIcon glyph={GLYPHS.speaker} className="cx-player__speaker" />
        <Slider label="Volume" value={volume} max={1} step={VOLUME_STEP} live valueText={`${Math.round(volume * 100)}%`} onChange={setVolume} />
        <TransportButton glyph={GLYPHS.shuffle} label="Shuffle" pressed={shuffle} onClick={toggleShuffle} />
        <TransportButton glyph={GLYPHS.repeat} label="Repeat" pressed={repeat} onClick={toggleRepeat} />
      </div>
    </div>
  );
}
