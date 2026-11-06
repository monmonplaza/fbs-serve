import { createInertiaApp } from "@inertiajs/react";
import type { ComponentType } from "react";
import { createRoot } from "react-dom/client";
import { api } from "@/api-service";
import { bootFromHash } from "@/context/ui";
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
        // Opened from a table QR code (/guest#t=<table>&k=<token>): join that table's session before the first render.
        const { table, token } = bootFromHash();
        (table && token ? api.guest.join(table, token) : Promise.resolve()).then(() => {
            createRoot(el).render(<App {...props} />);
        });
    },
});
