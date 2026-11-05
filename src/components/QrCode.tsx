import qrcode from 'qrcode-generator';

// Real QR code with a quiet zone of 2 modules, always dark on white so phones can read it.
export function QrCode({ text, label = 'QR code for the table link' }: { text: string; label?: string }) {
  const q = qrcode(0, 'M');
  q.addData(text);
  q.make();
  const n = q.getModuleCount();
  let d = '';
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (q.isDark(y, x)) d += `M${x} ${y}h1v1h-1z`;
  return (
    <svg className="qr" viewBox={`-2 -2 ${n + 4} ${n + 4}`} shapeRendering="crispEdges" role="img" aria-label={label}>
      <rect x={-2} y={-2} width={n + 4} height={n + 4} fill="#fff" />
      <path d={d} fill="#000" />
    </svg>
  );
}
