import { useState, type FormEvent } from 'react';
import type { Food } from '@/api/types';
import { Icon } from '@/components/Icon';
import { EtaTag } from '@/lib/foodDisplay';
import { peso } from '@/lib/format';

/** Variant picker, a bottom sheet inside the phone frame. */
export function PickSheet({ food, onClose, onAdd }: { food: Food; onClose: () => void; onAdd: (variantId: string) => void }) {
  const vs = food.variants ?? [];
  const [v, setV] = useState(vs[0]?.id ?? '');
  const sel = vs.some(x => x.id === v) ? v : vs[0]?.id;
  const submit = (e: FormEvent) => { e.preventDefault(); onAdd(sel!); };
  return (
    <div className="g-sheet-wrap">
      <button className="g-scrim" tabIndex={-1} aria-label="Close" onClick={onClose} />
      <form className="g-sheet" role="dialog" aria-modal="true" aria-label={`Choose an option for ${food.name}`} onSubmit={submit}
        onKeyDown={e => { if (e.key === 'Escape') onClose(); }}>
        <div className="g-sheet-head">
          <div className="grow"><h3>{food.name}</h3><p className="caption muted">Choose one</p></div>
          <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}><Icon name="x" /></button>
        </div>
        {vs.map(x => (
          <label key={x.id} className="radio-card">
            <input type="radio" name="variant" value={x.id} checked={x.id === sel} onChange={() => setV(x.id)} />
            <span className="grow"><b>{x.name}</b></span><b className="num">{peso(x.price)}</b>
          </label>
        ))}
        <EtaTag food={food} />
        <button className="btn btn-primary block"><Icon name="plus" size={20} />Add to plate</button>
      </form>
    </div>
  );
}
