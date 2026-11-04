import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';
import { closeModal, useModalStore, type ModalSpec } from '@/store/modal';

const EXIT_MS = 150;

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
            <h2 id="m-title">{shown.title}</h2>
            <button className="icon-btn" aria-label="Close" onClick={closeModal}><Icon name="x" /></button>
          </div>
          {shown.content}
        </>
      )}
    </dialog>
  );
}
