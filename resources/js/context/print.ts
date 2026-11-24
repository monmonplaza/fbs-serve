import { create } from "zustand";
import type { AppliedDiscount, Order, PaymentMethod, SalesReport } from "@/types/restaurant";

/** The orders of one bill and the discount to show on it. A paid order carries its own payment details. */
export interface PrintJob {
    orders: Order[];
    discount: AppliedDiscount | null;
    /** The method the guest pays (or paid) with. When it has a QR code (GCash, Maya), the QR is printed on the bill. */
    payWith?: PaymentMethod | null;
    /** Print only this guest's receipt (a share key) of a bill paid guest by guest. */
    guest?: string;
}

/** `preview` is the bill shown on screen; `job` is the one being sent to the printer. */
export const usePrint = create<{ job: PrintJob | null; preview: PrintJob | null }>(() => ({
    job: null,
    preview: null,
}));

/** Shows the bill on screen, with a Print button for the browser's print dialog. Needs a mounted <BillPrintHost /> and <BillPreviewHost />. */
export const printBill = (job: PrintJob) => usePrint.setState({ preview: job });

/** Printed table QR cards: one card per table, the code that never changes. */
export const useQrPrint = create<{ tables: { id: string; name: string }[] | null }>(() => ({ tables: null }));

/** Opens the print dialog with QR cards for these tables. Needs a mounted <QrPrintHost />. */
export const printTableQrs = (tables: { id: string; name: string }[]) => useQrPrint.setState({ tables });

/** A sales report to print (or save as PDF), with what it is compared with in words. */
export const useReportPrint = create<{ job: { report: SalesReport; comparedWith: string } | null }>(() => ({
    job: null,
}));

/** Opens the print dialog with the report. Needs a mounted <ReportPrintHost />. */
export const printSalesReport = (report: SalesReport, comparedWith: string) =>
    useReportPrint.setState({ job: { report, comparedWith } });
