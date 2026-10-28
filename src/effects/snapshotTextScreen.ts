/** Capture the flat text-mode screen for its ASCII transitions.
 * Character ranges retain preformatted art, wrapping, letter spacing, and scroll clipping.
 * This deliberately supports the screen's solid fills, square borders, plain images and canvases, not general CSS.
 */
export function snapshotTextScreen(root: HTMLElement): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const bounds = root.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.max(1, Math.round(bounds.width * dpr));
  canvas.height = Math.max(1, Math.round(bounds.height * dpr));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Text screen capture is unavailable');
  ctx.scale(dpr, dpr);
  ctx.translate(-bounds.left, -bounds.top);
  ctx.fillStyle = '#000';
  ctx.fillRect(bounds.left, bounds.top, bounds.width, bounds.height);

  const paint = (element: HTMLElement) => {
    const style = getComputedStyle(element);
    const box = element.getBoundingClientRect();
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0' || !box.width || !box.height) return;
    ctx.save();
    ctx.fillStyle = style.backgroundColor;
    ctx.fillRect(box.left, box.top, box.width, box.height);

    const border = (x: number, y: number, length: number, size: number, color: string, kind: string, vertical = false) => {
      if (!size || kind === 'none') return;
      ctx.fillStyle = color;
      if (kind === 'double' && size >= 3) {
        const stroke = size / 3;
        ctx.fillRect(x, y, vertical ? stroke : length, vertical ? length : stroke);
        ctx.fillRect(x + (vertical ? size - stroke : 0), y + (vertical ? 0 : size - stroke), vertical ? stroke : length, vertical ? length : stroke);
      } else if (kind === 'dashed' || kind === 'dotted') {
        const dash = kind === 'dotted' ? size : size * 4;
        for (let offset = 0; offset < length; offset += dash * 2) {
          const run = Math.min(dash, length - offset);
          ctx.fillRect(x + (vertical ? 0 : offset), y + (vertical ? offset : 0), vertical ? size : run, vertical ? run : size);
        }
      } else ctx.fillRect(x, y, vertical ? size : length, vertical ? length : size);
    };
    const top = parseFloat(style.borderTopWidth), bottom = parseFloat(style.borderBottomWidth);
    const left = parseFloat(style.borderLeftWidth), right = parseFloat(style.borderRightWidth);
    border(box.left, box.top, box.width, top, style.borderTopColor, style.borderTopStyle);
    border(box.left, box.bottom - bottom, box.width, bottom, style.borderBottomColor, style.borderBottomStyle);
    border(box.left, box.top, box.height, left, style.borderLeftColor, style.borderLeftStyle, true);
    border(box.right - right, box.top, box.height, right, style.borderRightColor, style.borderRightStyle, true);

    if (element instanceof HTMLImageElement) {
      if (element.complete && element.naturalWidth) ctx.drawImage(element, box.left, box.top, box.width, box.height);
      ctx.restore();
      return;
    }

    // Canvases are low-res pixel art scaled up, so keep their pixels hard.
    if (element instanceof HTMLCanvasElement) {
      ctx.imageSmoothingEnabled = style.imageRendering !== 'pixelated';
      if (element.width && element.height) ctx.drawImage(element, box.left, box.top, box.width, box.height);
      ctx.restore();
      return;
    }

    if (style.overflowX !== 'visible' || style.overflowY !== 'visible') {
      ctx.beginPath();
      ctx.rect(box.left + element.clientLeft, box.top + element.clientTop, element.clientWidth, element.clientHeight);
      ctx.clip();
    }
    for (const node of element.childNodes) {
      if (node instanceof HTMLElement) {
        paint(node);
        continue;
      }
      if (node.nodeType !== Node.TEXT_NODE || !node.textContent?.trim()) continue;
      ctx.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      ctx.fillStyle = style.color;
      ctx.textBaseline = 'alphabetic';
      const metrics = ctx.measureText('M');
      const size = parseFloat(style.fontSize);
      const ascent = metrics.fontBoundingBoxAscent ?? size * .8;
      const descent = metrics.fontBoundingBoxDescent ?? size * .2;
      const range = document.createRange();
      for (let index = 0; index < node.textContent.length; index++) {
        const character = node.textContent[index];
        if (!character.trim()) continue;
        range.setStart(node, index);
        range.setEnd(node, index + 1);
        const cell = range.getBoundingClientRect();
        if (!cell.width || cell.bottom < bounds.top || cell.top > bounds.bottom || cell.left > bounds.right) continue;
        ctx.fillText(character, cell.left, cell.top + (cell.height + ascent - descent) / 2);
      }
    }

    // The NFO uses empty flex pseudo-elements for its heading rules and metadata leaders.
    if (element.matches('.nfo-rule-title, .nfo-details dt')) {
      const pseudo = getComputedStyle(element, '::after');
      const content = document.createRange();
      content.selectNodeContents(element);
      const end = content.getBoundingClientRect().right;
      const x = end + (parseFloat(style.columnGap) || 0);
      const isLeader = element.matches('dt');
      border(x, isLeader ? box.bottom - 1 : box.top + box.height / 2,
        Math.max(0, box.right - x), 1, isLeader ? pseudo.borderBottomColor : pseudo.borderTopColor,
        isLeader ? 'dotted' : 'solid');
    }
    ctx.restore();
  };
  paint(root);
  return canvas;
}
