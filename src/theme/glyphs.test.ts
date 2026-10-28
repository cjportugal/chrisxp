import { describe, expect, it } from 'vitest';
import { GLYPHS, glyphSize } from './glyphs';

const LEGEND = /^[.#ocmyb]+$/;

describe('GLYPHS', () => {
  it.each(Object.entries(GLYPHS))('%s is a rectangle drawn only from the legend', (_name, glyph) => {
    const { width } = glyphSize(glyph);
    for (const row of glyph) {
      expect(row).toHaveLength(width);
      expect(row).toMatch(LEGEND);
    }
  });

  it.each(['prev', 'play', 'pause', 'stop', 'next', 'shuffle', 'repeat', 'speaker', 'presetPrev', 'presetNext'] as const)(
    'has an 11px-tall 1-bit %s transport glyph',
    (name) => {
      const glyph = GLYPHS[name];
      expect(glyphSize(glyph).height).toBe(11);
      expect(glyph.join('')).toMatch(/^[.#]+$/);
    }
  );

  it.each(['winamp', 'diablo', 'photos', 'about', 'trash', 'trashFull', 'folder'] as const)(
    '%s is a 32x32 1-bit icon: ink, paper and transparency only',
    (name) => {
      const glyph = GLYPHS[name];
      expect(glyphSize(glyph)).toEqual({ width: 32, height: 32 });
      expect(glyph.join('')).toMatch(/^[.#o]+$/);
    }
  );
});
