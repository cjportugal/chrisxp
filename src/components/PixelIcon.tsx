import type { CSSProperties } from 'react';
import { glyphSize, glyphToSvgDataUrl } from '../theme/glyphs';
import type { PixelGlyph } from '../theme/glyphs';

interface Props {
  glyph: PixelGlyph;
  /** Rendered width in CSS px. Defaults to the glyph's own width; use whole multiples to keep pixels square. */
  size?: number;
  alt?: string;
  className?: string;
  style?: CSSProperties;
}

/** A pixel glyph as a real <img>, so the boot reveal's color sampler can draw it. */
export default function PixelIcon({ glyph, size, alt = '', className, style }: Props) {
  const { width, height } = glyphSize(glyph);
  const renderedWidth = size ?? width;
  const renderedHeight = Math.round((renderedWidth * height) / width);

  return (
    <img
      className={className ? `cx-pixel ${className}` : 'cx-pixel'}
      src={glyphToSvgDataUrl(glyph)}
      alt={alt}
      width={renderedWidth}
      height={renderedHeight}
      draggable={false}
      style={{ display: 'block', width: renderedWidth, height: renderedHeight, ...style }}
    />
  );
}
