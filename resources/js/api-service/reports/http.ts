/**
 * @file api-service/reports/http.ts
 * Reports against the Laravel backend. Same method names and shapes as ./mock.ts.
 */

import { http, unwrap } from "@/api-service/client";
import type { SalesQuery } from "@/api-service/reports/mock";
import type { SalesReport } from "@/types/restaurant";

export const reportsHttp = {
    /** Dates are YYYY-MM-DD in the restaurant's time zone; the server counts sales on the day they were paid. */
    sales: async (q: SalesQuery) =>
        unwrap<SalesReport>(
            await http.get("/reports/sales", {
                params: {
                    from: q.from,
                    to: q.to,
                    group: q.group,
                    compare_from: q.compareFrom,
                    compare_to: q.compareTo,
                },
            }),
        ),
};
