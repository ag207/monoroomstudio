// 화면에 그린 SVG를 그대로 직렬화해 캔버스에 2배로 그리고 PNG로 내려받는다 (PRD 4.8).
// 외부 서비스를 쓰지 않고, data: URL이라 네트워크 요청도 생기지 않는다.

const BASE_WIDTH = 1200;
const SCALE = 2;

export function pngFileName(date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `room-layout-${date.getFullYear()}${p(date.getMonth() + 1)}${p(date.getDate())}.png`;
}

export function svgToDataUrl(svg: SVGSVGElement, width: number, height: number): string {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', String(width));
  clone.setAttribute('height', String(height));
  clone.removeAttribute('style');
  // 화면에서는 선 굵기를 px로 고정(non-scaling-stroke)하므로, 큰 이미지에서는 그만큼 굵게 바꾼다.
  const factor = width / 600;
  clone.querySelectorAll('[vector-effect]').forEach((el) => {
    const sw = Number(el.getAttribute('stroke-width') ?? 1);
    el.setAttribute('stroke-width', String(sw * factor));
    const dash = el.getAttribute('stroke-dasharray');
    if (dash) el.setAttribute('stroke-dasharray', dash.split(/[\s,]+/).map((d) => Number(d) * factor).join(' '));
  });
  const xml = new XMLSerializer().serializeToString(clone);
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('이미지를 만들지 못했어요'));
    img.src = src;
  });
}

export async function renderPng(svg: SVGSVGElement): Promise<Blob> {
  const vb = svg.viewBox.baseVal;
  const w = BASE_WIDTH * SCALE;
  const h = Math.round((w * vb.height) / vb.width);
  const img = await loadImage(svgToDataUrl(svg, w, h));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('캔버스를 쓸 수 없어요');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('PNG를 만들지 못했어요'))), 'image/png'),
  );
}

export async function downloadPng(svg: SVGSVGElement): Promise<void> {
  const blob = await renderPng(svg);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = pngFileName();
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
