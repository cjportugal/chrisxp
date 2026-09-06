const hash = (value: number) => {
  const n = Math.sin(value * 127.1 + 78.233) * 43758.5453;
  return n - Math.floor(n);
};

/** Fixed cells fill in irregular regions before any desktop recoloring begins. */
export function desktopRevealCell(col: number, row: number, progress: number, seed: number) {
  const region = Math.floor(col / 5) + Math.floor(row / 3) * 101;
  const id = col + row * 997;
  const takeover = .24 + hash(region + seed) * .22 + hash(id + seed) * .12;
  const reveal = .86 + hash(id + seed + 31) * .12;
  if (progress < .06) return 'image';
  if (progress >= reveal) return 'desktop';
  if (progress >= .66) return 'recolor';
  if (progress >= takeover) return 'random';
  return 'color';
}

export function desktopRandomCharacter(col: number, row: number, tick: number, seed: number) {
  const ramp = ':+*?2389ON@#%';
  return ramp[Math.floor(hash(col + row * 997 + tick * 29 + seed) * ramp.length)];
}

/** Color reference from the mounted desktop, using its real layout, images and text.
 * This is a low-resolution color map, not a replacement rendering of the desktop.
 */
export function sampleDesktopColors(root: HTMLElement, columns: number, rows: number, width: number, height: number) {
  const canvas = document.createElement('canvas'); canvas.width = columns; canvas.height = rows;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.scale(columns / width, rows / height);
  for (const element of [root, ...root.querySelectorAll<HTMLElement>('*')]) {
    const style = getComputedStyle(element), box = element.getBoundingClientRect();
    if (style.display === 'none' || style.visibility === 'hidden' || !box.width || !box.height) continue;
    ctx.fillStyle = style.backgroundColor; ctx.fillRect(box.x, box.y, box.width, box.height);
    if (element instanceof HTMLImageElement && element.complete && element.naturalWidth) {
      ctx.drawImage(element, box.x, box.y, box.width, box.height);
    }
    ctx.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    ctx.fillStyle = style.color; ctx.textBaseline = 'middle';
    for (const node of element.childNodes) {
      if (node.nodeType !== Node.TEXT_NODE || !node.textContent?.trim()) continue;
      const range = document.createRange(); range.selectNodeContents(node);
      const r = range.getBoundingClientRect();
      ctx.fillText(node.textContent.trim(), r.x, r.y + r.height / 2);
    }
  }
  return ctx.getImageData(0, 0, columns, rows).data;
}
