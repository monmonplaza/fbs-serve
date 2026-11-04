import { Icon } from '@/components/Icon';
import { Pill } from '@/components/Pill';
import type { Order, OrderStatus } from '@/api/types';
import { billKey, isTO, oMeta, total } from '@/lib/domain';
import { dt, peso, sum, tm } from '@/lib/format';
import { ChTag, sod, usePayName, useTableName } from './helpers';

export interface Group { k: string; main: Order; kids: Order[]; all: Order[] }

interface Props {
  groups: Group[];
  open: Record<string, boolean>;
  groupStatus: (g: Group) => OrderStatus;
  onToggle: (key: string) => void;
  onOpen: (o: Order) => void;
  onOpenOne: (o: Order) => void;
}

/** Table body rows: one row per bill, with an expandable chevron to show the additional orders. */
export function OrdersTable({ groups, open, groupStatus, onToggle, onOpen, onOpenOne }: Props) {
  const payName = usePayName(), tName = useTableName();
  return (
    <>
      {groups.map(g => {
        const o = g.main, many = g.all.length > 1, isOpen = !!open[g.k], gs = many ? { ...o, status: groupStatus(g) } : o;
        const pays = [...new Set(g.all.filter(x => x.payment).map(x => payName(x.payment)))];
        return (
          <GroupRows key={g.k}>
            <tr className="click" onClick={() => onOpen(o)}>
              <td>
                {many
                  ? <button className="gchev" aria-expanded={isOpen} aria-label={`${isOpen ? 'Hide' : 'Show'} additional orders`} onClick={e => { e.stopPropagation(); onToggle(g.k); }}><Icon name="right" size={18} /></button>
                  : billKey(o, sod) ? <span className="gspacer" /> : null}
                <button className="link num" onClick={e => { e.stopPropagation(); onOpen(o); }}>{o.id}</button>
                {many ? <span className="gtag">+{g.kids.length} additional</span> : null}
              </td>
              <td><Pill meta={oMeta(gs)} /></td>
              <td>{isTO(o) ? <><ChTag o={o} /> <span className="num">{o.pickup}</span></> : tName(o.table)}</td>
              <td className="num">{dt(o.createdAt)}, {tm(o.createdAt)}</td>
              <td className="num">{sum(g.all.flatMap(x => x.items).map(i => i.qty))} items</td>
              <td>{pays.length ? pays.join(', ') : <span className="muted">Not yet</span>}</td>
              <td className="r num"><b>{peso(sum(g.all.map(total)))}</b></td>
            </tr>
            {many && isOpen && g.all.map((x, i) => (
              <tr key={x.id} className="click gsub" onClick={() => onOpenOne(x)}>
                <td><button className="link num" onClick={e => { e.stopPropagation(); onOpenOne(x); }}>{x.id}</button><span className="gtag">{i ? 'Additional' : 'First order'}</span></td>
                <td><Pill meta={oMeta(x)} /></td>
                <td></td>
                <td className="num">{dt(x.createdAt)}, {tm(x.createdAt)}</td>
                <td className="num">{sum(x.items.map(it => it.qty))} items</td>
                <td></td>
                <td className="r num">{peso(total(x))}</td>
              </tr>
            ))}
          </GroupRows>
        );
      })}
    </>
  );
}
const GroupRows = ({ children }: { children: React.ReactNode }) => <>{children}</>;
