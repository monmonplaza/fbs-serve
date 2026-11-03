// Domain types. These mirror what the backend should return; ids are strings, times are epoch milliseconds.

export type ModuleId = 'dashboard' | 'orders' | 'reservations' | 'kitchen' | 'foods' | 'tables' | 'settings' | 'guide';

export type TableStatus = 'inactive' | 'active' | 'ordering' | 'eating' | 'billout' | 'cleaning';
export type OrderStatus = 'queued' | 'cooking' | 'plating' | 'completed' | 'ready' | 'served' | 'paid';
export type TakeoutChannel = 'walkin' | 'grab' | 'panda';
export type TakeoutSource = 'counter' | 'qr';
export type FoodStatus = 'available' | 'unavailable';
export type FoodTag = 'new' | 'must' | 'best';
export type ReservationStatus = 'booked' | 'arrived' | 'cancelled' | 'noshow';

export interface Category { id: string; name: string; desc: string }
export interface Variant { id: string; name: string; price: number }
export interface Food {
  id: string; cat: string; name: string; price: number; desc: string;
  status: FoodStatus; tags: FoodTag[]; eta: number; photos: string[];
  /** When set, `price` is the lowest variant price. */
  variants?: Variant[];
}
export interface PaymentMethod { id: string; name: string; details: string; active: boolean }
export interface Discount { id: string; name: string; pct: number; note: string; active: boolean }
export interface Role { id: string; name: string; modules: ModuleId[] }
export interface User { id: string; name: string; username: string; role: string; active: boolean; email?: string }
export interface Floor { id: string; name: string }

export interface TableBill { method: string; at: number }
export interface DiningTable {
  id: string; name: string; seats: number; floor: string;
  /** Position on the floor plan, in percent. */
  x: number; y: number;
  status: TableStatus;
  /** Identifies the QR session. A new token invalidates the old QR. */
  token: string | null;
  openedAt: number | null;
  bill: TableBill | null;
  guests?: number | null;
}

export interface OrderItem { foodId: string; variantId?: string; name: string; price: number; qty: number }
export interface Payment { method: string; amount: number }
export interface AppliedDiscount { name: string; pct: number }
export interface Order {
  id: string;
  /** Table id, or null for takeout. */
  table: string | null;
  /** Table session token, or 'old' for history. Orders with the same table and session share one bill. */
  session?: string;
  type?: 'takeout';
  pickup?: string; customer?: string; phone?: string;
  source?: TakeoutSource; channel?: TakeoutChannel; ref?: string;
  items: OrderItem[];
  status: OrderStatus;
  createdAt: number; servedAt?: number; readyAt?: number; paidAt?: number;
  by: string;
  /** Estimated minutes: the slowest dish. */
  eta: number;
  payment?: string; payments?: Payment[]; discount?: AppliedDiscount | null;
}

/** A guest's line on the shared plate, before it is sent to the kitchen. */
export interface PlateLine { id: string; foodId: string; variantId?: string; qty: number; by: string }

export interface Reservation {
  id: string; name: string; phone: string; pax: number; at: number;
  tableId: string | null; note: string; status: ReservationStatus;
  order: OrderItem[] | null;
  history: { at: number; text: string }[];
  cancelReason?: string;
  dismissed?: boolean; notified?: boolean;
}

export interface AppSettings { tableTimerOn: boolean; tableTimerMins: number }

/** Everything the backend owns. The mock API keeps one of these in memory. */
export interface Database {
  categories: Category[]; foods: Food[]; payments: PaymentMethod[]; discounts: Discount[];
  roles: Role[]; users: User[]; floors: Floor[]; tables: DiningTable[];
  orders: Order[]; plates: Record<string, PlateLine[]>; reservations: Reservation[];
  settings: AppSettings; orderSeq: number; takeoutSeq: number;
  /** Id of the Takeout-QR order the guest preview starts with (demo only). */
  demoTakeoutId?: string;
}
