import { describe, expect, it } from 'vitest';
import { parseTrackName } from './tracks';

describe('parseTrackName', () => {
  it('splits a numbered "artist - title" file name', () => {
    expect(parseTrackName('../assets/mp3/01-traxman - we can go anywhere.mp3')).toEqual({
      artist: 'traxman',
      title: 'we can go anywhere',
    });
  });

  it('keeps hyphens inside the artist', () => {
    expect(parseTrackName('/x/02-cj-dos - bouce2this.mp3')).toEqual({ artist: 'cj-dos', title: 'bouce2this' });
  });

  it('falls back to the whole stem as the title', () => {
    expect(parseTrackName('/x/untitled demo.ogg')).toEqual({ artist: '', title: 'untitled demo' });
  });

  it('drops the track number even without an artist', () => {
    expect(parseTrackName('/x/07 intro.mp3')).toEqual({ artist: '', title: 'intro' });
  });
});
