import type { ReactNode } from 'react';
import { NAV } from '@/api/constants';
import type { SettingsList } from '@/api/admin';

export interface Field {
  k: string; l: string; req?: boolean; hint?: string; max?: number;
  t?: 'check' | 'number' | 'select' | 'multi' | 'image';
}
export interface Cfg { title: string; one: string; fields: Field[]; extra?: string }
export type Row = { id: string; name: string } & Record<string, unknown>;

export const SET: Record<SettingsList, Cfg> = {
  payments: { title: 'Payment methods', one: 'payment method', fields: [{ k: 'name', l: 'Name', req: true }, { k: 'details', l: 'Details', hint: 'Account name or number the waiter needs.' }, { k: 'qr', l: 'QR code', t: 'image', hint: 'The restaurant’s QR code for this method. It is printed on the bill for the guest.' }, { k: 'needsRef', l: 'Needs a reference no.', t: 'check', hint: 'For GCash, Maya and cards: staff must enter the transaction reference before confirming payment.' }, { k: 'active', l: 'Guests can choose this', t: 'check' }] },
  discounts: { title: 'Discounts', one: 'discount', fields: [{ k: 'name', l: 'Name', req: true }, { k: 'pct', l: 'Percent off', t: 'number', req: true }, { k: 'note', l: 'Requirement', hint: 'For example: Valid senior citizen ID' }, { k: 'active', l: 'Active', t: 'check' }] },
  users: { title: 'Users', one: 'user', fields: [{ k: 'name', l: 'Full name', req: true }, { k: 'username', l: 'Username', req: true }, { k: 'role', l: 'Role', t: 'select' }, { k: 'active', l: 'Can sign in', t: 'check' }] },
  roles: { title: 'User roles', one: 'role', fields: [{ k: 'name', l: 'Role name', req: true }, { k: 'modules', l: 'Modules this role can open', t: 'multi' }] },
  tables: { title: 'Tables', one: 'table', fields: [{ k: 'name', l: 'Table name', req: true, hint: 'For example: Table 18 or VIP room' }, { k: 'seats', l: 'Seats', t: 'number', req: true, max: 40 }, { k: 'floor', l: 'Floor level', t: 'select' }], extra: 'Status' },
  floors: { title: 'Floor levels', one: 'floor level', fields: [{ k: 'name', l: 'Floor name', req: true, hint: 'For example: Ground floor, 2nd floor, Rooftop' }], extra: 'Tables' },
  categories: { title: 'Food categories', one: 'category', fields: [{ k: 'name', l: 'Name', req: true }, { k: 'desc', l: 'Description' }], extra: 'Foods' },
};
export const TAB_ORDER: (SettingsList | 'timer')[] = ['payments', 'discounts', 'users', 'roles', 'categories', 'tables', 'floors', 'timer'];

export type Opts = Record<string, [string, string][]>;
export const optsFor = (roles: { id: string; name: string }[], floors: { id: string; name: string }[] = []): Opts => ({ role: roles.map(r => [r.id, r.name]), modules: NAV.map(n => [n.id, n.label]), floor: floors.map(f => [f.id, f.name]) });

export function cell(f: Field, v: unknown, opts: Opts): ReactNode {
  if (f.t === 'check') return v ? <span className="pill p-ok">Yes</span> : <span className="pill p-neutral">No</span>;
  if (f.t === 'image') return v ? <img src={String(v)} alt={`${f.l} preview`} width={36} height={36} style={{ borderRadius: 6, objectFit: 'cover', background: '#fff' }} /> : <span className="muted">—</span>;
  if (f.t === 'select') return opts[f.k]?.find(o => o[0] === v)?.[1] || '—';
  if (f.t === 'multi') {
    const s = ((v as string[]) || []).map(id => opts[f.k]?.find(o => o[0] === id)?.[1]).filter(Boolean).join(', ');
    return s || <span className="muted">None</span>;
  }
  if (f.k === 'pct') return <span className="num">{String(v)}%</span>;
  return v ? String(v) : <span className="muted">—</span>;
}
