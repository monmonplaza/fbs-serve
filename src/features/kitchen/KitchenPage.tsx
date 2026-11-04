import { api } from '@/api';
import { KITCHEN, OSTAT } from '@/api/constants';
import { useInvalidate, useOrders, useTables } from '@/api/queries';
import type { Order } from '@/api/types';
import { isTO } from '@/lib/domain';
import { mins } from '@/lib/format';
import { useNow } from '@/lib/useNow';
import { Icon } from '@/components/Icon';
import { toast } from '@/store/toast';
import { ChannelTag } from './ChannelTag';

export function KitchenPage() {
  const { data: orders } = useOrders();
  const { data: tables } = useTables();
  const invalidate = useInvalidate();
  useNow();
  const tName = (id: string | null) => tables.find(t => t.id === id)?.name ?? '';

  async function act(o: Order) {
    try {
      if (o.status !== 'completed') {
        const r = await api.kitchen.next(o.id);
        await invalidate('orders', 'tables');
        toast(`${r.id} moved to ${OSTAT[r.status]!.l}`);
      } else if (isTO(o)) {
        await api.kitchen.toReady(o.id);
        await invalidate('orders');
        toast(`${o.pickup} is ready for pickup at the counter`);
      } else {
        await api.kitchen.serve(o.id);
        await invalidate('orders', 'tables');
        toast(`${o.id} served to ${tName(o.table)}`);
      }
    } catch (e) { toast((e as Error).message); }
  }

  return (
    <>
      <div className="page-head"><div><h1>Kitchen</h1><p className="muted">Oldest order first. Move each order forward as you work on it.</p></div></div>
      <div className="kanban" data-keep="kanban">
        {KITCHEN.map(st => {
          const list = orders.filter(o => o.status === st).sort((a, b) => a.createdAt - b.createdAt);
          return (
            <section className="col" aria-label={OSTAT[st]!.l} key={st}>
              <div className="col-head"><h3>{OSTAT[st]!.l}</h3><span className="badge soft num">{list.length}</span></div>
              {list.map(o => {
                const m = mins(o.createdAt), eta = o.eta || 20, late = m > eta;
                return (
                  <article className={`kcard${late ? ' overdue' : ''}`} key={o.id}>
                    <div className="kcard-top">
                      <div>
                        <b className="num">{o.id}</b>
                        <div className="caption muted">{isTO(o) ? o.pickup : tName(o.table)} · {o.by}</div>
                        {isTO(o) && <ChannelTag o={o} extra="to-tag" />}
                      </div>
                      <span className={`caption num ${late ? 'late label' : 'muted'}`} title={`Target ${eta} min`}><Icon name="clock" size={16} /> {m} / {eta} min</span>
                    </div>
                    <ul>{o.items.map((i, k) => <li key={k}><b className="num">{i.qty}×</b><span>{i.name}</span></li>)}</ul>
                    {isTO(o) && <p className="caption muted">Pack to go.</p>}
                    <button className={`btn ${st === 'completed' ? 'btn-secondary' : 'btn-outline'} block`} onClick={() => act(o)}>
                      {st !== 'completed' ? <>{OSTAT[st]!.next}<Icon name="arrow" size={20} /></> : isTO(o) ? 'Ready for pickup' : OSTAT[st]!.next}
                    </button>
                  </article>
                );
              })}
              {!list.length && <p className="col-empty">No orders here.</p>}
            </section>
          );
        })}
      </div>
    </>
  );
}
