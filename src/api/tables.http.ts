// Tables, floors and QR sessions against the Laravel backend. Same method names and shapes as ./tables.ts (the mock).
import { http, unwrap } from './http/client';
import type { DiningTable, Floor, Order } from './types';

export const tablesHttp = {
  list: async () => unwrap<DiningTable[]>(await http.get('/tables')),
  floors: async () => unwrap<Floor[]>(await http.get('/floors')),
  activate: async (id: string, guests: number) => unwrap<DiningTable>(await http.post(`/tables/${id}/activate`, { guests })),
  clean: async (id: string) => unwrap<DiningTable>(await http.post(`/tables/${id}/clean`)),
  serveOrder: async (orderId: string) => unwrap<Order>(await http.patch(`/orders/${orderId}/serve`)),
  move: async (id: string, x: number, y: number) => unwrap<DiningTable>(await http.patch(`/tables/${id}/position`, { x, y })),
  add: async (v: { name: string; seats: number; floor: string }) => unwrap<DiningTable>(await http.post('/tables', v)),
  update: async (id: string, v: Partial<Pick<DiningTable, 'name' | 'seats' | 'floor'>>) => unwrap<DiningTable>(await http.post(`/tables/${id}`, v)),
  remove: async (id: string) => { await http.delete(`/tables/${id}`); },
  addFloor: async (name: string) => unwrap<Floor>(await http.post('/floors', { name })),
  updateFloor: async (id: string, name: string) => unwrap<Floor>(await http.post(`/floors/${id}`, { name })),
  removeFloor: async (id: string) => { await http.delete(`/floors/${id}`); },
};
