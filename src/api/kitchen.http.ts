// Kitchen queue against the Laravel backend. Same method names and shapes as ./kitchen.ts (the mock).
import { http, unwrap } from './http/client';
import { clientRef, keys } from './queries';
import type { DiningTable, Order } from './types';
import { isTO } from '@/lib/domain';
import { useUi } from '@/store/ui';

const tName = (id: string | null) => clientRef.current?.getQueryData<DiningTable[]>(keys.tables)?.find(t => t.id === id)?.name ?? '';

export const kitchenHttp = {
  queue: async () => unwrap<Order[]>(await http.get('/kitchen/queue')),

  /** Queued, then cooking, then plating, then order out. Bell entries are still raised by the client until the server pushes events. */
  next: async (id: string) => {
    const o = unwrap<Order>(await http.patch(`/orders/${id}/advance`));
    if (o.status === 'completed') {
      useUi.getState().notify('plate', isTO(o) ? `${o.pickup} is cooked and ready to pack` : `${o.code ?? o.id} is ready to serve to ${tName(o.table)}`, isTO(o) ? 'orders' : 'tables');
    }
    return o;
  },
  toReady: async (id: string) => {
    const o = unwrap<Order>(await http.patch(`/orders/${id}/ready`));
    useUi.getState().notify('bag', `${o.pickup} is ready for pickup at the counter`, 'orders');
    return o;
  },
  serve: async (id: string) => unwrap<Order>(await http.patch(`/orders/${id}/serve`)),
};
