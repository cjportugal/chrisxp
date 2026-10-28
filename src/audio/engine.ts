/** The audio graph the player's analyzers hang off. Exists once the first play has created a context. */
export interface AudioGraph {
  context: AudioContext;
  /** butterchurn's `connectAudio` takes this. */
  source: MediaElementAudioSourceNode;
  /** For the spectrum bars. */
  analyser: AnalyserNode;
}

export interface EngineEvents {
  onTime: (seconds: number) => void;
  onDuration: (seconds: number) => void;
  onEnded: () => void;
  /** The element started or stopped on its own account too: media keys and the browser's media controls. */
  onPlay: () => void;
  onPause: () => void;
  onGraph: (graph: AudioGraph) => void;
}

/** What the player store drives. Navigation (shuffle, repeat) lives in the store; an engine only plays a URL. */
export interface PlayerEngine {
  load: (url: string) => void;
  play: () => Promise<void>;
  pause: () => void;
  stop: () => void;
  seek: (seconds: number) => void;
  setVolume: (volume: number) => void;
  dispose: () => void;
}

/** One <audio> element routed through Web Audio. The context is created on the first play, inside the
 * click that asked for it, so the autoplay policy lets it start.
 */
export class AudioEngine implements PlayerEngine {
  private readonly audio = new Audio();
  private readonly events: EngineEvents;
  private graph: AudioGraph | null = null;

  constructor(events: EngineEvents) {
    this.events = events;
    this.audio.preload = 'metadata';
    this.audio.addEventListener('timeupdate', this.handleTime);
    this.audio.addEventListener('durationchange', this.handleDuration);
    this.audio.addEventListener('ended', this.handleEnded);
    this.audio.addEventListener('play', this.handlePlay);
    this.audio.addEventListener('pause', this.handlePause);
  }

  private handleTime = () => this.events.onTime(this.audio.currentTime);
  private handleDuration = () => this.events.onDuration(this.audio.duration);
  private handleEnded = () => this.events.onEnded();
  private handlePlay = () => this.events.onPlay();
  private handlePause = () => this.events.onPause();

  private ensureGraph(): AudioGraph {
    if (this.graph) return this.graph;
    const context = new AudioContext();
    const source = context.createMediaElementSource(this.audio);
    const analyser = context.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.6;
    // The default -30 dB ceiling pins every bar of a mastered track to the top.
    analyser.minDecibels = -85;
    analyser.maxDecibels = -15;
    source.connect(analyser);
    analyser.connect(context.destination);
    this.graph = { context, source, analyser };
    this.events.onGraph(this.graph);
    return this.graph;
  }

  load(url: string) {
    this.audio.src = url;
    this.events.onTime(0);
  }

  async play() {
    const { context } = this.ensureGraph();
    if (context.state === 'suspended') await context.resume();
    await this.audio.play();
  }

  pause() {
    this.audio.pause();
  }

  stop() {
    this.audio.pause();
    this.audio.currentTime = 0;
    this.events.onTime(0);
  }

  seek(seconds: number) {
    this.audio.currentTime = seconds;
    this.events.onTime(seconds);
  }

  setVolume(volume: number) {
    this.audio.volume = volume;
  }

  dispose() {
    this.audio.pause();
    this.audio.removeEventListener('timeupdate', this.handleTime);
    this.audio.removeEventListener('durationchange', this.handleDuration);
    this.audio.removeEventListener('ended', this.handleEnded);
    this.audio.removeEventListener('play', this.handlePlay);
    this.audio.removeEventListener('pause', this.handlePause);
    this.audio.removeAttribute('src');
    this.audio.load();
    if (this.graph) {
      this.graph.source.disconnect();
      this.graph.analyser.disconnect();
      void this.graph.context.close();
      this.graph = null;
    }
  }
}

/** Reads a file's duration without playing it, for the playlist's time column. NaN if it never loads. */
export function probeDuration(url: string): Promise<number> {
  return new Promise((resolve) => {
    const probe = new Audio();
    probe.preload = 'metadata';
    const done = (seconds: number) => {
      probe.removeAttribute('src');
      resolve(seconds);
    };
    probe.addEventListener('loadedmetadata', () => done(probe.duration), { once: true });
    probe.addEventListener('error', () => done(Number.NaN), { once: true });
    probe.src = url;
  });
}
