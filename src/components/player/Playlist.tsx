import { useEffect, useRef, useState } from 'react';
import { formatTime } from '../../audio/time';
import { usePlayerStore } from '../../store/playerStore';

/** Winamp's playlist editor in mono: click selects, double-click (or Enter) plays, the playing row is inverted. */
export default function Playlist() {
  const tracks = usePlayerStore((state) => state.tracks);
  const durations = usePlayerStore((state) => state.durations);
  const index = usePlayerStore((state) => state.index);
  const playTrack = usePlayerStore((state) => state.playTrack);
  const [selected, setSelected] = useState(index);
  const listRef = useRef<HTMLOListElement>(null);

  // Scroll the list itself: scrollIntoView would also scroll .cx-desktop sideways while the column slides in.
  useEffect(() => {
    const list = listRef.current;
    const row = list?.children[selected] as HTMLElement | undefined;
    if (!list || !row) return;
    if (row.offsetTop < list.scrollTop) list.scrollTop = row.offsetTop;
    else if (row.offsetTop + row.offsetHeight > list.scrollTop + list.clientHeight) {
      list.scrollTop = row.offsetTop + row.offsetHeight - list.clientHeight;
    }
  }, [selected]);

  const known = durations.filter(Number.isFinite);
  const total = known.reduce((sum, seconds) => sum + seconds, 0);
  const count = `${tracks.length} track${tracks.length === 1 ? '' : 's'}`;

  return (
    <div className="cx-player__playlist">
      <ol
        ref={listRef}
        className="cx-player__tracks cx-scroll cx-mono"
        role="listbox"
        aria-label="Playlist"
        aria-activedescendant={`cx-track-${selected}`}
        tabIndex={0}
        onKeyDown={(event) => {
          const delta = { ArrowUp: -1, ArrowDown: 1 }[event.key];
          if (delta !== undefined) {
            event.preventDefault();
            event.stopPropagation();
            setSelected((current) => Math.min(tracks.length - 1, Math.max(0, current + delta)));
          } else if (event.key === 'Enter') {
            event.preventDefault();
            void playTrack(selected);
          }
        }}
      >
        {tracks.map((track, i) => (
          <li
            key={track.url}
            id={`cx-track-${i}`}
            className="cx-player__track"
            role="option"
            aria-selected={i === selected}
            data-current={i === index ? 'true' : 'false'}
            onClick={() => setSelected(i)}
            onDoubleClick={() => void playTrack(i)}
          >
            <span className="cx-player__track-name">
              {i + 1}. {track.artist ? `${track.artist} - ${track.title}` : track.title}
            </span>
            <span className="cx-player__track-time">{Number.isFinite(durations[i]) ? formatTime(durations[i]) : ''}</span>
          </li>
        ))}
      </ol>
      <div className="cx-player__playlist-footer cx-mono">
        {count} · {known.length === tracks.length ? formatTime(total) : '…'}
      </div>
    </div>
  );
}
