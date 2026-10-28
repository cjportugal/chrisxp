/** The bundled playlist: every audio file in src/assets/mp3, in file name order. */
export interface Track {
  url: string;
  artist: string;
  title: string;
}

/** `NN-artist - title.ext` → `{ artist, title }`; anything else keeps its stem (minus a leading track
 * number) as the title.
 */
export function parseTrackName(path: string): { artist: string; title: string } {
  const stem = path.replace(/^.*[\\/]/, '').replace(/\.[^/.]+$/, '');
  const unnumbered = stem.replace(/^\d+[\s._-]*/, '');
  const split = unnumbered.indexOf(' - ');
  if (split === -1) return { artist: '', title: unnumbered.trim() };
  return { artist: unnumbered.slice(0, split).trim(), title: unnumbered.slice(split + 3).trim() };
}

const audioModules = import.meta.glob('../assets/mp3/*.{mp3,ogg,wav,flac,aac,opus,m4a}', {
  eager: true,
  import: 'default',
  query: '?url',
}) as Record<string, string>;

export const TRACKS: Track[] = Object.entries(audioModules)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([path, url]) => ({ url, ...parseTrackName(path) }));
