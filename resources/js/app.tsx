import { createInertiaApp } from "@inertiajs/react";
import type { ComponentType } from "react";
import { createRoot } from "react-dom/client";
import { api } from "@/api-service";
import { bootFromHash, useUi } from "@/context/ui";
import { saveKey, setAppUrl } from "@/lib/guestLink";
import { withResolvedLayout } from "./ResolvedLayout";

const appName = "FBS Serve";

createInertiaApp({
    title: (title) => (title ? `${title} · ${appName}` : appName),
    resolve: (name) => {
        const pages = import.meta.glob<{ default: ComponentType & { layout?: never } }>("./pages/**/*.tsx", {
            eager: true,
        });
        const key = Object.keys(pages).find((k) => k.toLowerCase() === `./pages/${name}.tsx`.toLowerCase());

        if (!key) {
            throw new Error(`Page not found: ./pages/${name}.tsx`);
        }

        const page = pages[key];
        withResolvedLayout(page.default, name);

        return page;
    },
    setup({ el, App, props }) {
        setAppUrl(props.initialPage.props.appUrl);
        // Opened from a table QR code: rejoin the session this phone joined before (or the link's token) before the first
        // render. A token from a session that has ended is dropped, and the phone asks for the new table code.
        const { table, token } = bootFromHash();
        (table && token ? api.guest.join(table, token) : Promise.resolve(false)).then((ok) => {
            if (table && token) {
                saveKey(table, ok ? token : null);
                if (ok) useUi.getState().setGuest({ key: token });
            }
            createRoot(el).render(<App {...props} />);
        });
    },
});
