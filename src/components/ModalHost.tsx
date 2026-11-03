import { useEffect, useRef } from 'react';
import { Icon } from './Icon';
import { closeModal, useModalStore } from '@/store/modal';

/** The single app dialog. Open it with `openModal({ title, content })` from anywhere. */
export function ModalHost() {
  const spec = useModalStore(s => s.spec);
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current!;
    if (spec && !d.open) d.showModal();
    if (!spec && d.open) d.close();
  }, [spec]);

  return (
    <dialog id="modal" ref={ref} className={spec?.wide ? 'wide' : ''} aria-labelledby="m-title" onClose={closeModal}>
      {spec && (
        <>
          <div className="m-head">
            <h2 id="m-title">{spec.title}</h2>
            <button className="icon-btn" aria-label="Close" onClick={closeModal}><Icon name="x" /></button>
          </div>
          {spec.content}
        </>
      )}
    </dialog>
  );
}
