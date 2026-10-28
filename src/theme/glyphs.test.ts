import { describe, expect, it } from 'vitest';
import { GLYPHS, glyphSize } from './glyphs';

const LEGEND = /^[.#ocmybwsgnBtaGlRrpfOY]+$/;

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

  it.each(['winamp', 'diablo', 'photos', 'about', 'trash', 'trashFull', 'folder'] as const)('%s is a 32x32 icon', (name) => {
    expect(glyphSize(GLYPHS[name])).toEqual({ width: 32, height: 32 });
  });

  it.each(['winamp', 'diablo', 'photos', 'about', 'trash', 'trashFull'] as const)(
    '%s is a Win95 icon: drawn in the 16-color palette rather than 1-bit paper',
    (name) => {
      expect(GLYPHS[name].join('')).toMatch(/^[.#cmybwsgnBtaGlRrpfOY]+$/);
      expect(GLYPHS[name].join('')).toMatch(/[wsgnBtaGlRrpfOY]/);
    }
  );
});
