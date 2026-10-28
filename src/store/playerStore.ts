import { create } from 'zustand';
import type { AudioGraph, EngineEvents, PlayerEngine } from '../audio/engine';
import { nextIndex, prevIndex } from '../audio/playlist';
import { TRACKS } from '../audio/tracks';
import type { Track } from '../audio/tracks';

export type PlayerStatus = 'stopped' | 'playing' | 'paused';

interface PlayerStore {
  tracks: Track[];
  /** Per-track durations for the playlist, NaN until probed. */
  durations: number[];
  index: number;
  status: PlayerStatus;
  currentTime: number;
  duration: number;
  volume: number;
  shuffle: boolean;
  repeat: boolean;
  /** Null until the first play builds the Web Audio graph. */
  graph: AudioGraph | null;
  presetName: string;
  /** Registered by the visualizer while it is mounted, so the menubar can step presets. */
  presetStepper: ((delta: number) => void) | null;
  /** Milkdrop is spread over the desktop instead of sitting in its frame. */
  visOnDesktop: boolean;

  attachEngine: (create: (events: EngineEvents) => PlayerEngine) => void;
  detachEngine: () => void;
  play: () => Promise<void>;
  pause: () => void;
  togglePlay: () => Promise<void>;
  stop: () => void;
  next: () => Promise<void>;
  prev: () => Promise<void>;
  playTrack: (index: number) => Promise<void>;
  seek: (seconds: number) => void;
  setVolume: (volume: number) => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  setDurations: (durations: number[]) => void;
  setPresetName: (name: string) => void;
  setPresetStepper: (stepper: ((delta: number) => void) | null) => void;
  setVisOnDesktop: (onDesktop: boolean) => void;
  nextPreset: () => void;
}

/** The engine lives outside the state: it is an imperative object, not something to render from. */
let engine: PlayerEngine | null = null;
let loadedUrl: string | null = null;

export const usePlayerStore = create<PlayerStore>((set, get) => {
  const load = (index: number) => {
    const track = get().tracks[index];
    if (!engine || !track) return;
    engine.load(track.url);
    loadedUrl = track.url;
    set({ index, currentTime: 0, duration: 0 });
  };

  /** Move to `index`, carrying on playing if we were. */
  const goTo = async (index: number) => {
    const wasPlaying = get().status === 'playing';
    load(index);
    if (wasPlaying) await get().play();
    else set({ status: 'stopped' });
  };

  const events: EngineEvents = {
    onTime: (currentTime) => set({ currentTime }),
    onDuration: (duration) => set({ duration: Number.isFinite(duration) ? duration : 0 }),
    onGraph: (graph) => set({ graph }),
    // Only transitions between playing and paused: a stop pauses the element too, and must stay a stop.
    onPlay: () => set({ status: 'playing' }),
    onPause: () => {
      if (get().status === 'playing') set({ status: 'paused' });
    },
    onEnded: () => {
      const { index, tracks, shuffle, repeat } = get();
      const following = nextIndex(index, tracks.length, { shuffle, repeat });
      if (following === null) {
        get().stop();
        return;
      }
      load(following);
      void get().play();
    },
  };

  return {
    tracks: TRACKS,
    durations: TRACKS.map(() => Number.NaN),
    index: 0,
    status: 'stopped',
    currentTime: 0,
    duration: 0,
    volume: 0.8,
    shuffle: false,
    repeat: false,
    graph: null,
    presetName: '',
    presetStepper: null,
    visOnDesktop: false,

    attachEngine: (createEngine) => {
      engine?.dispose();
      engine = createEngine(events);
      loadedUrl = null;
      engine.setVolume(get().volume);
    },

    detachEngine: () => {
      engine?.dispose();
      engine = null;
      loadedUrl = null;
      set({ status: 'stopped', currentTime: 0, duration: 0, graph: null });
    },

    play: async () => {
      if (!engine) return;
      const { tracks, index } = get();
      if (loadedUrl !== tracks[index]?.url) load(index);
      try {
        await engine.play();
        set({ status: 'playing' });
      } catch {
        // Autoplay refusal or a file that will not decode: leave the transport where it was.
      }
    },

    pause: () => {
      if (get().status !== 'playing') return;
      engine?.pause();
      set({ status: 'paused' });
    },

    togglePlay: async () => {
      if (get().status === 'playing') get().pause();
      else await get().play();
    },

    stop: () => {
      engine?.stop();
      set({ status: 'stopped', currentTime: 0 });
    },

    // The buttons always wrap, like Winamp's; repeat only decides what happens when the last track ends.
    next: () => {
      const { index, tracks, shuffle } = get();
      return goTo(nextIndex(index, tracks.length, { shuffle, repeat: true }) ?? 0);
    },

    prev: () => {
      const { index, tracks, shuffle } = get();
      return goTo(prevIndex(index, tracks.length, { shuffle, repeat: true }));
    },

    playTrack: async (index) => {
      load(index);
      await get().play();
    },

    seek: (seconds) => {
      if (loadedUrl === null) return;
      engine?.seek(seconds);
    },

    setVolume: (volume) => {
      const clamped = Math.min(1, Math.max(0, volume));
      engine?.setVolume(clamped);
      set({ volume: clamped });
    },

    toggleShuffle: () => set((state) => ({ shuffle: !state.shuffle })),
    toggleRepeat: () => set((state) => ({ repeat: !state.repeat })),
    setDurations: (durations) => set({ durations }),
    setPresetName: (presetName) => set({ presetName }),
    setPresetStepper: (presetStepper) => set({ presetStepper }),
    setVisOnDesktop: (visOnDesktop) => set({ visOnDesktop }),
    nextPreset: () => get().presetStepper?.(1),
  };
});
