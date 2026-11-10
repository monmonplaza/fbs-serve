import { create } from "zustand";
import type { AppliedDiscount, Order, PaymentMethod } from "@/types/restaurant";

/** The orders of one bill and the discount to show on it. A paid order carries its own payment details. */
export interface PrintJob {
    orders: Order[];
    discount: AppliedDiscount | null;
    /** The method the guest pays (or paid) with. When it has a QR code (GCash, Maya), the QR is printed on the bill. */
    payWith?: PaymentMethod | null;
}

export const usePrint = create<{ job: PrintJob | null }>(() => ({ job: null }));

/** Opens the browser's print dialog with the bill. Needs a mounted <BillPrintHost />. */
export const printBill = (job: PrintJob) => usePrint.setState({ job });

/** Printed table QR cards: one card per table, the code that never changes. */
export const useQrPrint = create<{ tables: { id: string; name: string }[] | null }>(() => ({ tables: null }));

/** Opens the print dialog with QR cards for these tables. Needs a mounted <QrPrintHost />. */
export const printTableQrs = (tables: { id: string; name: string }[]) => useQrPrint.setState({ tables });
