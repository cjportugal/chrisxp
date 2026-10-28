import { beforeEach, describe, expect, it } from 'vitest';
import type { EngineEvents, PlayerEngine } from '../audio/engine';
import { usePlayerStore } from './playerStore';

class FakeEngine implements PlayerEngine {
  calls: string[] = [];
  playResult: Promise<void> = Promise.resolve();
  volume = -1;
  readonly events: EngineEvents;
  constructor(events: EngineEvents) {
    this.events = events;
  }
  load(url: string) {
    this.calls.push(`load ${url}`);
  }
  play() {
    this.calls.push('play');
    return this.playResult;
  }
  pause() {
    this.calls.push('pause');
  }
  stop() {
    this.calls.push('stop');
  }
  seek(seconds: number) {
    this.calls.push(`seek ${seconds}`);
  }
  setVolume(volume: number) {
    this.volume = volume;
  }
  dispose() {
    this.calls.push('dispose');
  }
}

const TRACKS = [
  { url: 'a.mp3', artist: 'A', title: 'one' },
  { url: 'b.mp3', artist: 'B', title: 'two' },
  { url: 'c.mp3', artist: 'C', title: 'three' },
];

let engine: FakeEngine;
const store = () => usePlayerStore.getState();

beforeEach(() => {
  usePlayerStore.getState().detachEngine();
  usePlayerStore.setState({
    tracks: TRACKS,
    index: 0,
    status: 'stopped',
    currentTime: 0,
    duration: 0,
    volume: 0.8,
    shuffle: false,
    repeat: false,
  });
  store().attachEngine((events) => (engine = new FakeEngine(events)));
});

describe('playerStore', () => {
  it('applies the volume to a freshly attached engine', () => {
    expect(engine.volume).toBe(0.8);
  });

  it('loads the current track and plays it', async () => {
    await store().play();
    expect(engine.calls).toEqual(['load a.mp3', 'play']);
    expect(store().status).toBe('playing');
  });

  it('stays stopped when the browser refuses to play', async () => {
    engine.playResult = Promise.reject(new Error('NotAllowedError'));
    await store().play();
    expect(store().status).toBe('stopped');
  });

  it('pauses and resumes without reloading', async () => {
    await store().play();
    store().togglePlay();
    expect(store().status).toBe('paused');
    await store().togglePlay();
    expect(engine.calls).toEqual(['load a.mp3', 'play', 'pause', 'play']);
    expect(store().status).toBe('playing');
  });

  it('keeps playing on the next track when skipping during playback', async () => {
    await store().play();
    await store().next();
    expect(store().index).toBe(1);
    expect(engine.calls.slice(-2)).toEqual(['load b.mp3', 'play']);
    expect(store().status).toBe('playing');
  });

  it('only moves the cursor when skipping while stopped', async () => {
    await store().next();
    expect(store().index).toBe(1);
    expect(engine.calls).toEqual(['load b.mp3']);
    expect(store().status).toBe('stopped');
  });

  it('wraps the manual next and previous buttons around the playlist', async () => {
    usePlayerStore.setState({ index: 2 });
    await store().next();
    expect(store().index).toBe(0);
    await store().prev();
    expect(store().index).toBe(2);
  });

  it('stops at the end of the playlist without repeat', async () => {
    usePlayerStore.setState({ index: 2 });
    await store().play();
    engine.events.onEnded();
    expect(store().status).toBe('stopped');
    expect(store().index).toBe(2);
    expect(engine.calls.at(-1)).toBe('stop');
  });

  it('starts over at the end of the playlist with repeat', async () => {
    usePlayerStore.setState({ index: 2, repeat: true });
    await store().play();
    engine.events.onEnded();
    expect(store().index).toBe(0);
    expect(engine.calls.slice(-2)).toEqual(['load a.mp3', 'play']);
  });

  it('plays a picked track from the playlist', async () => {
    await store().playTrack(2);
    expect(store().index).toBe(2);
    expect(engine.calls).toEqual(['load c.mp3', 'play']);
  });

  it('rewinds on stop', async () => {
    await store().play();
    engine.events.onTime(42);
    store().stop();
    expect(store().status).toBe('stopped');
    expect(store().currentTime).toBe(0);
    expect(engine.calls.at(-1)).toBe('stop');
  });

  it('mirrors the engine clock', () => {
    engine.events.onTime(12.5);
    engine.events.onDuration(200);
    expect(store().currentTime).toBe(12.5);
    expect(store().duration).toBe(200);
  });

  it('clamps the volume', () => {
    store().setVolume(1.4);
    expect(store().volume).toBe(1);
    expect(engine.volume).toBe(1);
    store().setVolume(-1);
    expect(engine.volume).toBe(0);
  });

  it('disposes the engine and stops when detached', async () => {
    await store().play();
    store().detachEngine();
    expect(engine.calls.at(-1)).toBe('dispose');
    expect(store().status).toBe('stopped');
    expect(store().currentTime).toBe(0);
  });

  it('follows a pause that came from outside the UI, like a media key', async () => {
    await store().play();
    engine.events.onPause();
    expect(store().status).toBe('paused');
    engine.events.onPlay();
    expect(store().status).toBe('playing');
  });

  it('ignores the element pausing as part of a stop', async () => {
    await store().play();
    store().stop();
    engine.events.onPause();
    expect(store().status).toBe('stopped');
  });
});
