import { useState, type ReactNode } from 'react';
import { Icon } from '@/components/Icon';
import { useDiscounts } from '@/api/queries';
import type { Order, Payment, PaymentMethod } from '@/api/types';
import { toast } from '@/store/toast';
import { closeModal } from '@/store/modal';
import { peso, r2, sum } from '@/lib/format';
import { subtotal } from '@/lib/domain';

interface Row { amt: string; method: string }

// n equal shares of due, in cents; the last payer takes the leftover cent(s). Methods are kept for payers that already had one.
function equalRows(n: number, due: number, def: string, old: Row[] = []): Row[] {
  const base = Math.floor((due * 100) / n) / 100;
  const rows = Array.from({ length: n }, (_, i) => ({ amt: String(base), method: old[i]?.method || def }));
  rows[n - 1].amt = String(r2(due - base * (n - 1)));
  return rows;
}

interface Props {
  /** The unpaid orders this payment covers. */
  orders: Order[];
  methods: PaymentMethod[];
  defaultMethod?: string;
  hint?: string;
  /** Shown above the method and discount fields (items, order details). */
  before: ReactNode;
  cancelLabel: string;
  submitLabel: string;
  onSubmit: (discountId: string | null, pays: Payment[]) => Promise<void> | void;
}

/** Payment method, discount, amount to collect and the split-bill panel, shared by every payment modal. */
export function PayForm({ orders, methods, defaultMethod, hint, before, cancelLabel, submitLabel, onSubmit }: Props) {
  const discounts = useDiscounts().data.filter(d => d.active);
  const [method, setMethod] = useState(defaultMethod && methods.some(m => m.id === defaultMethod) ? defaultMethod : methods[0]?.id ?? '');
  const [discId, setDiscId] = useState('');
  const [on, setOn] = useState(false);
  const [n, setN] = useState(2);
  const [nText, setNText] = useState('2');
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);

  const disc = discounts.find(d => d.id === discId);
  const sub = sum(orders.map(subtotal));
  const off = disc ? r2((sub * disc.pct) / 100) : 0;
  const due = r2(sub - off);
  const left = r2(due - sum(rows.map(r => +r.amt || 0)));
  const splitOk = !on || (left === 0 && rows.every(r => +r.amt > 0));

  const changeDisc = (id: string) => {
    setDiscId(id);
    const d = discounts.find(x => x.id === id);
    if (on) setRows(equalRows(n, r2(sub - (d ? r2((sub * d.pct) / 100) : 0)), method, rows));
  };
  const toggleSplit = (v: boolean) => { setOn(v); if (v) setRows(equalRows(n, due, method, rows)); };
  const changeN = (text: string) => {
    setNText(text);
    const k = Math.min(12, Math.max(2, Math.round(+text) || 2));
    setN(k);
    setRows(equalRows(k, due, method, rows));
  };
  const setRow = (i: number, p: Partial<Row>) => setRows(rows.map((r, j) => (j === i ? { ...r, ...p } : r)));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    let pays: Payment[];
    if (!on) pays = [{ method, amount: due }];
    else {
      pays = rows.map(r => ({ method: r.method, amount: r2(+r.amt || 0) }));
      if (pays.some(p => !(p.amount > 0)) || r2(sum(pays.map(p => p.amount)) - due) !== 0) { toast(`The payments must add up to ${peso(due)}`); return; }
    }
    setBusy(true);
    try { await onSubmit(discId || null, pays); } finally { setBusy(false); }
  };

  return (
    <form id="pay-form" onSubmit={submit}>
      <div className="m-body">
        {before}
        <div className="form-grid">
          <label className="field" hidden={on}>
            <span>Payment method</span>
            <select id="pay-method" name="method" className="input" value={method} onChange={e => setMethod(e.target.value)}>
              {methods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            {hint ? <span className="hint">{hint}</span> : null}
          </label>
          <label className="field">
            <span>Discount</span>
            <select id="pay-disc" name="disc" className="input" value={discId} onChange={e => changeDisc(e.target.value)}>
              <option value="">No discount</option>
              {discounts.map(d => <option key={d.id} value={d.id}>{d.name} ({d.pct}%)</option>)}
            </select>
            <span className="hint" id="pay-note">{disc ? `Requirement: ${disc.note || 'none'}.` : 'Check the guest’s ID before applying a discount.'}</span>
          </label>
        </div>
        <div className="sum" id="pay-sum">
          <div><span className="muted">Subtotal</span><span className="num">{peso(sub)}</span></div>
          {disc && <div><span className="muted">{disc.name} ({disc.pct}%)</span><span className="num">−{peso(off)}</span></div>}
          <div className="total"><span>Amount to collect</span><span className="num">{peso(sub - off)}</span></div>
        </div>
        <div className="split">
          <label className="check"><input type="checkbox" name="split" checked={on} onChange={e => toggleSplit(e.target.checked)} />Split the bill</label>
          <div id="pay-split" className="split" hidden={!on}>
            {on && (
              <>
                <div className="split-head">
                  <label className="field" style={{ width: 150 }}>
                    <span>Number of payers</span>
                    <input className="input num" type="number" min={2} max={12} inputMode="numeric" value={nText} onChange={e => changeN(e.target.value)} onBlur={() => setNText(String(n))} />
                  </label>
                  <button type="button" className="btn btn-outline" onClick={() => setRows(equalRows(n, due, method, rows))}>Split equally</button>
                </div>
                <div className="split-rows">
                  {rows.map((r, i) => (
                    <div key={i} className="split-row">
                      <b>Payer {i + 1}</b>
                      <input className="input num" type="number" min={0.01} step={0.01} inputMode="decimal" value={r.amt} aria-label={`Payer ${i + 1} amount`} onChange={e => setRow(i, { amt: e.target.value })} />
                      <select className="input" value={r.method} aria-label={`Payer ${i + 1} payment method`} onChange={e => setRow(i, { method: e.target.value })}>
                        {methods.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
                <div id="split-left" className={`split-left ${left !== 0 ? 'bad' : ''}`} role="status">
                  {left === 0 ? `Adds up to ${peso(due)}` : left > 0 ? `${peso(left)} still to assign` : `${peso(-left)} over the total`}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="m-foot">
        <button type="button" className="btn btn-outline" onClick={closeModal}>{cancelLabel}</button>
        <button className="btn btn-primary" disabled={!splitOk || busy}><Icon name="check" size={20} />{submitLabel}</button>
      </div>
    </form>
  );
}
