// utils/exportAsSVG.ts
import { Stroke } from '../hooks/useWhiteboard';

export function exportAsSVG(
  strokes: Stroke[],
  width: number,
  height: number
): string {
  const svgHeader = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`;

  const paths = strokes.map((stroke) => {
    const d = stroke.points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
      .join(' ');
    const color = stroke.tool === 'eraser' ? '#fff' : '#000';

    return `<path d="${d}" stroke="${color}" stroke-width="${stroke.strokeWidth}" fill="none" stroke-linecap="round" stroke-linejoin="round" />`;
  });

  const svgFooter = `</svg>`;

  return `${svgHeader}${paths.join('')}${svgFooter}`;
}
