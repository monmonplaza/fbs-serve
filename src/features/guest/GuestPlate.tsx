import { api } from '@/api';
import { useFoods, useInvalidate } from '@/api/queries';
import { useState } from 'react';
import { useUi } from '@/store/ui';
import { TO } from '@/api/constants';
import type { PlateLine } from '@/api/types';
import { Icon } from '@/components/Icon';
import { itemName, orderEta, unitPrice } from '@/lib/domain';
import { peso } from '@/lib/format';
import { toast } from '@/store/toast';

/** A cooking request for one plate line, e.g. "Less spicy, no onion". It goes to the kitchen with the order. */
function NoteField({ line, onSave }: { line: PlateLine; onSave: (note: string) => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(line.note ?? '');
  const commit = () => { const n = text.trim().slice(0, 120); setText(n); if (n !== (line.note ?? '')) onSave(n); };
  if (!open && !line.note) return (
    <div className="pnote"><button className="link-btn" onClick={() => setOpen(true)}><Icon name="edit" size={16} />Add note for the kitchen</button></div>
  );
  return (
    <div className="pnote">
      <textarea className="input" rows={2} value={text} maxLength={120} placeholder="e.g. less spicy, no onion" aria-label="Note for the kitchen"
        onChange={e => setText(e.target.value)} onBlur={commit} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); } }} autoFocus={!line.note} />
    </div>
  );
}

const Empty = ({ icon, title, text, browse }: { icon: string; title: string; text: string; browse?: boolean }) => (
  <div className="center">
    <div className="big-ic"><Icon name={icon} size={32} /></div>
    <h3>{title}</h3>
    <p className="muted">{text}</p>
    {browse && <button className="btn btn-primary" onClick={() => useUi.getState().setGuest({ tab: 'menu' })}>Browse menu</button>}
  </div>
);

/** The shared plate. At a table every guest sees who added each line; the Takeout plate belongs to one customer. */
export function GuestPlate({ plate, tableId, tableName }: { plate: PlateLine[]; tableId: string; tableName?: string }) {
  const foods = useFoods().data, invalidate = useInvalidate(), me = useUi(s => s.guest.name);
  const takeout = tableId === TO;
  if (!plate.length) return takeout
    ? <Empty icon="bag" title="Your plate is empty" text="Pick food from the menu, then place your takeout order." browse />
    : <Empty icon="plate" title="Your plate is empty" text={`Everyone at ${tableName} adds to the same plate. Pick food from the menu.`} browse />;
  const qty = async (id: string, d: number) => {
    try { await api.guest.changeQty(tableId, id, d); await invalidate('plate'); } catch (e) { toast((e as Error).message); }
  };
  const saveNote = async (id: string, note: string) => {
    try { await api.guest.setNote(tableId, id, note); await invalidate('plate'); } catch (e) { toast((e as Error).message); }
  };
  const lines = plate.map(l => ({ l, f: foods.find(x => x.id === l.foodId) })).filter((x): x is { l: PlateLine; f: NonNullable<typeof x.f> } => !!x.f);
  const wait = orderEta(plate.flatMap(l => { const f = foods.find(x => x.id === l.foodId); return f ? [{ foodId: f.id, name: f.name, price: 0, qty: l.qty }] : []; }), foods);
  return (
    <>
      <div>
        <h3>Your plate</h3>
        <p className="caption muted">{takeout ? 'Packed to go. You pay at the counter when you pick it up.' : `Shared by everyone at ${tableName}. Only one guest sends it to the kitchen.`}</p>
      </div>
      <div className="alert info">
        <Icon name="clock" />
        {takeout
          ? <p><b>Ready in about {wait} min</b><br /><span className="caption">The kitchen starts cooking as soon as you place the order.</span></p>
          : <p><b>Estimated wait: about {wait} min</b><br /><span className="caption">The kitchen cooks your dishes at the same time, so the wait is about as long as the slowest dish.</span></p>}
      </div>
      <div className="card" style={{ padding: '4px 16px' }}>
        {lines.map(({ l, f }) => (
          <div key={l.id} className="pline">
            <div className="grow">
              <b>{itemName(f, l.variantId)}</b>
              <div className="caption muted">
                {!takeout && <>{l.by}{l.by === me ? ' (you)' : ''} · </>}<span className="num">{peso(unitPrice(f, l.variantId) * l.qty)}</span> · <span className="num">{f.eta} min</span>
              </div>
            </div>
            <div className="stepper">
              <button aria-label={`Remove one ${f.name}`} onClick={() => qty(l.id, -1)}><Icon name={l.qty > 1 ? 'minus' : 'trash'} size={20} /></button>
              <span className="num">{l.qty}</span>
              <button aria-label={`Add one ${f.name}`} onClick={() => qty(l.id, 1)}><Icon name="plus" size={20} /></button>
            </div>
            <NoteField key={l.id + (l.note ?? '')} line={l} onSave={n => saveNote(l.id, n)} />
          </div>
        ))}
      </div>
    </>
  );
}
