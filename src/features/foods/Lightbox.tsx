import { useEffect, useRef, useState } from 'react';
import { create } from 'zustand';
import type { Food } from '@/api/types';
import { hasV } from '@/lib/domain';
import { clamp, peso } from '@/lib/format';
import { Icon } from '@/components/Icon';
import { toast } from '@/store/toast';

/** `page` fills the browser window; `phone` stays inside the guest phone frame (see PhoneLightbox). */
type Scope = 'page' | 'phone';
const useLightbox = create<{ food: Food | null; scope: Scope }>(() => ({ food: null, scope: 'page' }));

/** Opens the full-screen photo gallery. Needs a mounted <LightboxHost />. */
export function openGallery(food: Food, scope: Scope = 'page'): void {
  if (!food.photos.length) return toast('No photos yet for ' + food.name);
  useLightbox.setState({ food, scope });
}
const closeGallery = () => useLightbox.setState({ food: null });

export function LightboxHost() {
  const food = useLightbox(s => s.scope === 'page' ? s.food : null);
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current!;
    if (food && !d.open) d.showModal();
    if (!food && d.open) d.close();
  }, [food]);
  return (
    <dialog ref={ref} className="lb" aria-label="Food photos" onClose={closeGallery}>
      {food && <Gallery key={food.id} food={food} />}
    </dialog>
  );
}
/** Same gallery, drawn inside the guest phone so it never covers the staff screen. Mount it inside `.phone`. */
export function PhoneLightbox() {
  const food = useLightbox(s => s.scope === 'phone' ? s.food : null);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (food) ref.current?.focus(); }, [food]);
  if (!food) return null;
  return (
    <div ref={ref} className="lb lb-in" role="dialog" aria-modal="true" aria-label="Food photos" tabIndex={-1}
      onKeyDown={e => { if (e.key === 'Escape') { e.stopPropagation(); closeGallery(); } }}>
      <Gallery key={food.id} food={food} />
    </div>
  );
}
/** Alias so a page can mount the host by either name. */
export const Lightbox = LightboxHost;
export const FoodGallery = LightboxHost;

function Gallery({ food: f }: { food: Food }) {
  const n = f.photos.length;
  const [view, setView] = useState({ i: 0, s: 1, x: 0, y: 0 });
  const [panning, setPanning] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const v = useRef(view);
  v.current = view;
  const ptrs = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ d: number; s: number } | null>(null);
  const pan = useRef<{ x: number; y: number } | null>(null);

  // Keep the picture inside the stage: pan limits follow the zoom.
  const apply = (p: { i: number; s: number; x: number; y: number }) => {
    const st = stage.current;
    const mx = st ? (p.s - 1) * st.clientWidth / 2 : 0, my = st ? (p.s - 1) * st.clientHeight / 2 : 0;
    setView({ ...p, x: clamp(p.x, -mx, mx), y: clamp(p.y, -my, my) });
  };
  const zoom = (z: number) => { const s = clamp(z, 1, 4); apply({ ...v.current, s, ...(s === 1 ? { x: 0, y: 0 } : {}) }); };
  const go = (i: number) => { if (i < 0 || i >= n) return; apply({ i, s: 1, x: 0, y: 0 }); };

  // Non-passive wheel listener so the page does not scroll while zooming.
  useEffect(() => {
    const st = stage.current!;
    const wheel = (e: WheelEvent) => { e.preventDefault(); zoom(v.current.s - Math.sign(e.deltaY) * 0.25); };
    st.addEventListener('wheel', wheel, { passive: false });
    return () => st.removeEventListener('wheel', wheel);
  }, []);

  const dist = () => { const [a, b] = [...ptrs.current.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
  const down = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    stage.current!.setPointerCapture(e.pointerId);
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.current.size === 2) { pinch.current = { d: dist(), s: v.current.s }; pan.current = null; }
    else if (v.current.s > 1) { pan.current = { x: e.clientX - v.current.x, y: e.clientY - v.current.y }; setPanning(true); }
  };
  const move = (e: React.PointerEvent) => {
    if (!ptrs.current.has(e.pointerId)) return;
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch.current && ptrs.current.size === 2) zoom(pinch.current.s * dist() / pinch.current.d);
    else if (pan.current) apply({ ...v.current, x: e.clientX - pan.current.x, y: e.clientY - pan.current.y });
  };
  const up = (e: React.PointerEvent) => {
    ptrs.current.delete(e.pointerId);
    if (ptrs.current.size < 2) pinch.current = null;
    if (!ptrs.current.size) { pan.current = null; setPanning(false); }
  };
  const key = (e: React.KeyboardEvent) => {
    const act = ({ ArrowLeft: () => go(v.current.i - 1), ArrowRight: () => go(v.current.i + 1), '+': () => zoom(v.current.s + 0.5), '=': () => zoom(v.current.s + 0.5), '-': () => zoom(v.current.s - 0.5) } as Record<string, () => void>)[e.key];
    if (act) { e.preventDefault(); act(); }
  };

  const { i, s, x, y } = view;
  return (
    <div style={{ display: 'contents' }} onKeyDown={key}>
      <div className="lb-top">
        <div className="grow"><b>{f.name}</b><div className="caption num">Photo {i + 1} of {n} · {hasV(f) ? 'from ' : ''}{peso(f.price)} · about {f.eta} min</div></div>
        <button className="icon-btn" aria-label="Close photos" onClick={closeGallery}><Icon name="x" /></button>
      </div>
      <div ref={stage} className={`lb-stage${s > 1 ? ' zoomed' : ''}${panning ? ' panning' : ''}`}
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
        onDoubleClick={e => { if (!(e.target as HTMLElement).closest('button')) zoom(s > 1 ? 1 : 2.5); }}>
        <img src={f.photos[i]} alt={`${f.name}, photo ${i + 1} of ${n}`} style={{ transform: `translate(${x}px, ${y}px) scale(${s})` }} />
        {n > 1 && <>
          <button className="icon-btn lb-nav prev" aria-label="Previous photo" disabled={!i} onClick={() => go(i - 1)}><Icon name="arrow" /></button>
          <button className="icon-btn lb-nav next" aria-label="Next photo" disabled={i >= n - 1} onClick={() => go(i + 1)}><Icon name="arrow" /></button>
        </>}
      </div>
      <div className="lb-bottom">
        <div className="lb-thumbs">
          {n > 1 && f.photos.map((src, k) => <button key={k} aria-label={`Photo ${k + 1}`} aria-current={k === i} onClick={() => go(k)}><img src={src} alt="" /></button>)}
        </div>
        <div className="lb-zoom">
          <button className="icon-btn" aria-label="Zoom out" onClick={() => zoom(s - 0.5)}><Icon name="minus" /></button>
          <span className="num" aria-live="polite">{Math.round(s * 100)}%</span>
          <button className="icon-btn" aria-label="Zoom in" onClick={() => zoom(s + 0.5)}><Icon name="plus" /></button>
        </div>
      </div>
    </div>
  );
}
