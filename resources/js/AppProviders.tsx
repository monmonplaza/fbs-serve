import { useEffect, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { USE_HTTP } from "@/api-service/client";
import { clientRef } from "@/hooks/useApi";
import { useReservationNotices } from "@/hooks/useReservationNotices";
import { useUi } from "@/context/ui";
import { BillPrintHost } from "@/components/BillPrintHost";
import { LightboxHost } from "@/components/foods/Lightbox";
import { ModalHost } from "@/components/ModalHost";
import { Toast } from "@/components/Toast";

// With the real backend, other devices (kitchen, waiter, guest phones) change the data, so every query re-checks
// the server every few seconds while the tab is visible and again when the tab regains focus.
const POLL_MS = 4000;
const client = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 0,
            refetchOnWindowFocus: USE_HTTP,
            refetchInterval: USE_HTTP ? POLL_MS : false,
            retry: false,
        },
    },
});
// Code outside React (for example a banner button) invalidates through this reference.
clientRef.current = client;

function Hosts({ children }: { children: ReactNode }) {
    const guestOnly = useUi((s) => s.guestOnly);
    useReservationNotices();
    useEffect(() => {
        document.body.classList.toggle("solo", guestOnly);
    }, [guestOnly]);

    return (
        <>
            {children}
            <LightboxHost />
            <ModalHost />
            <BillPrintHost />
            <Toast />
        </>
    );
}

export function AppProviders({ children }: { children: ReactNode }) {
    return (
        <QueryClientProvider client={client}>
            <Hosts>{children}</Hosts>
        </QueryClientProvider>
    );
}
