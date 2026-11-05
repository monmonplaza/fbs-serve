import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';
import { closeModal, useModalStore, type ModalSpec } from '@/store/modal';

const EXIT_MS = 150;

const ICON_RULES: [RegExp, string][] = [
  [/log out/i, 'logout'], [/profile/i, 'user'], [/delete|can.t delete/i, 'trash'], [/qr/i, 'qr'],
  [/pay|collect|receive|bill/i, 'wallet'], [/takeout|rider/i, 'bag'], [/reserv|seat|reschedule|go to a date|cancel/i, 'calendar'],
  [/activate|table|floor/i, 'table'], [/send plate|advance order/i, 'plate'], [/food|categor/i, 'utensils'],
  [/edit|add /i, 'edit'], [/user|role|discount|payment method/i, 'sliders'], [/^ord-/i, 'receipt'],
];
const modalIcon = (spec: ModalSpec) => {
  if (spec.icon) return spec.icon;
  const t = typeof spec.title === 'string' ? spec.title : '';
  return ICON_RULES.find(([re]) => re.test(t))?.[1] ?? 'receipt';
};

/**
 * The single app dialog. Open it with `openModal({ title, content })` from anywhere.
 * It animates in, and keeps the last content on screen while it animates out.
 */
export function ModalHost() {
  const spec = useModalStore(s => s.spec);
  const ref = useRef<HTMLDialogElement>(null);
  const [shown, setShown] = useState<ModalSpec | null>(null);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    const d = ref.current!;
    if (spec) {
      setShown(spec);
      setClosing(false);
      if (!d.open) d.showModal();
      return;
    }
    if (!d.open) { setShown(null); return; }
    setClosing(true);
    const t = setTimeout(() => { d.close(); setClosing(false); setShown(null); }, EXIT_MS);
    return () => clearTimeout(t);
  }, [spec]);

  return (
    <dialog
      id="modal"
      ref={ref}
      className={`${shown?.wide ? 'wide' : ''} ${closing ? 'closing' : ''}`}
      aria-labelledby="m-title"
      // Escape closes through the store so the exit animation runs.
      onCancel={e => { e.preventDefault(); closeModal(); }}
      onClose={closeModal}
    >
      {shown && (
        <>
          <div className="m-head">
            <span className="m-ic" aria-hidden="true"><Icon name={modalIcon(shown)} size={20} /></span>
            <h2 id="m-title">{shown.title}</h2>
            <button className="icon-btn" aria-label="Close" onClick={closeModal}><Icon name="x" size={20} /></button>
          </div>
          {shown.content}
        </>
      )}
    </dialog>
  );
}
