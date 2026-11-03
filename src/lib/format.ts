export const peso = (n: number) => '₱' + Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const tm = (d: number) => new Date(d).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' });
export const dt = (d: number) => new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
export const sameDay = (a: number, b: number) => new Date(a).toDateString() === new Date(b).toDateString();
export const mins = (d: number) => Math.max(0, Math.round((Date.now() - d) / 60000));
export const uid = () => Math.random().toString(36).slice(2, 8);
export const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
export const r2 = (n: number) => Math.round(n * 100) / 100;
export const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
