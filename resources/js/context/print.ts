import { create } from "zustand";
import type { AppliedDiscount, Order, PaymentMethod } from "@/types/restaurant";

/** The orders of one bill and the discount to show on it. A paid order carries its own payment details. */
export interface PrintJob {
    orders: Order[];
    discount: AppliedDiscount | null;
    /** The method the guest will pay with. Its QR code is printed on an unpaid bill. */
    payWith?: PaymentMethod | null;
}

export const usePrint = create<{ job: PrintJob | null }>(() => ({ job: null }));

/** Opens the browser's print dialog with the bill. Needs a mounted <BillPrintHost />. */
export const printBill = (job: PrintJob) => usePrint.setState({ job });
