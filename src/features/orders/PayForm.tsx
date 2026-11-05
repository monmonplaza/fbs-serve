import { useState, type ReactNode } from 'react';
import { Icon } from '@/components/Icon';
import { useDiscounts } from '@/api/queries';
import type { Order, Payment, PaymentMethod } from '@/api/types';
import { closeModal } from '@/store/modal';
import { printBill } from '@/store/print';
import { toast } from '@/store/toast';
import { peso, r2, sum } from '@/lib/format';
import { subtotal } from '@/lib/domain';

interface Props {
  /** The unpaid orders this payment covers. */
  orders: Order[];
  methods: PaymentMethod[];
  defaultMethod?: string;
  hint?: string;
  /** Shows a Print bill button that prints these orders with the chosen discount. */
  printable?: boolean;
  /** Shown above the method and discount fields (items, order details). */
  before: ReactNode;
  cancelLabel: string;
  submitLabel: string;
  onSubmit: (discountId: string | null, pays: Payment[]) => Promise<void> | void;
}

/** Payment method, discount and amount to collect, shared by every payment modal. */
export function PayForm({ orders, methods, defaultMethod, hint, printable, before, cancelLabel, submitLabel, onSubmit }: Props) {
  const discounts = useDiscounts().data.filter(d => d.active);
  const [method, setMethod] = useState(defaultMethod && methods.some(m => m.id === defaultMethod) ? defaultMethod : methods[0]?.id ?? '');
  const [discId, setDiscId] = useState('');
  const [recv, setRecv] = useState('');
  const [ref, setRef] = useState('');
  const [busy, setBusy] = useState(false);

  const disc = discounts.find(d => d.id === discId);
  const m = methods.find(x => x.id === method);
  const needsRef = !!m?.needsRef;
  const noRef = needsRef && !ref.trim();
  const sub = sum(orders.map(subtotal));
  const off = disc ? r2((sub * disc.pct) / 100) : 0;
  const due = r2(sub - off);
  const changeDisc = (id: string) => setDiscId(id);
  // Blank means the customer paid the exact amount.
  const received = recv.trim() === '' ? null : r2(+recv);
  const short = received != null && received < due;
  const change = received != null && !short ? r2(received - due) : 0;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (short) { toast(`The amount received is less than the amount due (${peso(due)})`); return; }
    if (noRef) { toast(`Enter the reference no. for ${m!.name}`); return; }
    const pays: Payment[] = [{ method, amount: due, received: received ?? due, ...(needsRef ? { ref: ref.trim() } : {}) }];
    setBusy(true);
    try { await onSubmit(discId || null, pays); } finally { setBusy(false); }
  };

  return (
    <form id="pay-form" onSubmit={submit}>
      <div className="m-body">
        {before}
        <div className="form-grid">
          <label className="field">
            <span>Payment method</span>
            <select id="pay-method" name="method" className="input" value={method} onChange={e => setMethod(e.target.value)}>
              {methods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            {hint ? <span className="hint">{hint}</span> : null}
          </label>
          {needsRef ? (
            <label className="field">
              <span>Reference no.</span>
              <input id="pay-ref" name="ref" className="input num" value={ref} maxLength={40} autoComplete="off" placeholder="e.g. 1234 567 890123" onChange={e => setRef(e.target.value)} aria-required="true" />
              <span className="hint">Check it in your {m!.name} app or SMS before you confirm.</span>
            </label>
          ) : null}
          <label className="field">
            <span>Discount</span>
            <select id="pay-disc" name="disc" className="input" value={discId} onChange={e => changeDisc(e.target.value)}>
              <option value="">No discount</option>
              {discounts.map(d => <option key={d.id} value={d.id}>{d.name} ({d.pct}%)</option>)}
            </select>
            <span className="hint" id="pay-note">{disc ? `Requirement: ${disc.note || 'none'}.` : 'Check the guest’s ID before applying a discount.'}</span>
          </label>
        </div>
        <div className="sum" aria-label="Order total">
          <div><span className="muted">Subtotal</span><span className="num">{peso(sub)}</span></div>
          {disc && <div><span className="muted">{disc.name} ({disc.pct}%)</span><span className="num">−{peso(off)}</span></div>}
        </div>
      </div>
      {/* Pinned above the buttons so the amounts stay in view while the order scrolls. */}
      <div className="m-sticky">
        <label className="field">
          <span>Amount received</span>
          <input id="pay-received" className="input num" type="number" min={0} step={0.01} inputMode="decimal" value={recv} placeholder={String(due)}
            onChange={e => setRecv(e.target.value)} aria-describedby="pay-recv-hint" />
          <span className="hint" id="pay-recv-hint">Leave blank if the exact amount is paid.</span>
        </label>
        <div className="sum" id="pay-sum" aria-label="Transaction breakdown">
          <div className="total"><span>Amount due</span><span className="num">{peso(due)}</span></div>
          <div><span className="muted">Amount received</span><span className="num">{peso(received ?? due)}</span></div>
          {short
            ? <div><span className="muted">Still to collect</span><span className="num" style={{ color: 'var(--error)' }}>{peso(r2(due - received!))}</span></div>
            : <div><span className="muted">Change</span><span className="num"><b>{peso(change)}</b></span></div>}
        </div>
      </div>
      <div className="m-foot">
        <button type="button" className="btn btn-outline" onClick={closeModal}>{cancelLabel}</button>
        {printable ? <button type="button" className="btn btn-outline" onClick={() => printBill({ orders, discount: disc ? { name: disc.name, pct: disc.pct } : null, payWith: m?.qr ? m : null })}><Icon name="receipt" size={20} />Print bill</button> : null}
        <button className="btn btn-primary" disabled={busy || short || noRef}><Icon name="check" size={20} />{submitLabel}</button>
      </div>
    </form>
  );
}
