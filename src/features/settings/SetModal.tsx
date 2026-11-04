import { useState } from 'react';
import { api } from '@/api';
import type { SettingsList } from '@/api/admin';
import { useInvalidate } from '@/api/queries';
import { closeModal } from '@/store/modal';
import { toast } from '@/store/toast';
import { SET, type Opts, type Row } from './config';

export function SetModal({ list, row, opts }: { list: SettingsList; row: Row | null; opts: Opts }) {
  const cfg = SET[list], n = !row, invalidate = useInvalidate();
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy) return;
    const fd = new FormData(e.currentTarget), v: Record<string, unknown> = {};
    cfg.fields.forEach(x => { v[x.k] = x.t === 'check' ? fd.has(x.k) : x.t === 'multi' ? fd.getAll(x.k) : x.t === 'number' ? +(fd.get(x.k) as string) : String(fd.get(x.k) ?? '').trim(); });
    setBusy(true);
    try {
      await api.admin.saveSetting(list, row ? row.id : null, v);
      await invalidate(list, 'tables', 'floors');
      closeModal(); toast(`${v.name} saved`);
    } catch (err) { setBusy(false); toast(err instanceof Error ? err.message : 'Could not save'); }
  };
  return (
    <form id="set-form" onSubmit={submit}>
      <div className="m-body">
        {cfg.fields.map(f => {
          const id = 'sf-' + f.k, v = row ? row[f.k] : f.t === 'check' ? true : f.t === 'multi' ? [] : undefined;
          if (f.t === 'check') return <label key={f.k} className="check"><input id={id} type="checkbox" name={f.k} defaultChecked={!!v} />{f.l}</label>;
          if (f.t === 'select') return (
            <label key={f.k} className="field"><span>{f.l}</span>
              <select id={id} name={f.k} className="input" defaultValue={v as string}>{(opts[f.k] || []).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
            </label>
          );
          if (f.t === 'multi') return (
            <fieldset key={f.k} className="field" style={{ border: 0, padding: 0, margin: 0 }}>
              <span className="label">{f.l}</span>
              <div className="checks">{(opts[f.k] || []).map(([k, l]) => <label key={k} className="check"><input type="checkbox" name={f.k} value={k} defaultChecked={((v as string[]) || []).includes(k)} />{l}</label>)}</div>
            </fieldset>
          );
          return (
            <label key={f.k} className="field"><span>{f.l}</span>
              <input id={id} name={f.k} className="input" {...(f.t === 'number' ? { type: 'number', min: 1, max: f.max || 100, inputMode: 'numeric' as const } : {})}
                required={f.req} defaultValue={v == null ? '' : String(v)} />
              {f.hint ? <span className="hint">{f.hint}</span> : null}
            </label>
          );
        })}
      </div>
      <div className="m-foot">
        <button type="button" className="btn btn-outline" onClick={closeModal}>Cancel</button>
        <button className="btn btn-primary" disabled={busy}>{n ? `Add ${cfg.one}` : 'Save changes'}</button>
      </div>
    </form>
  );
}
