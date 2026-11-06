import type { ReactNode } from "react";
import { AppProviders } from "./AppProviders";
import { AppShell } from "./layouts/AppShell";

/** Login and the guest phone draw their own chrome; every other page sits in the staff AppShell. */
const isBare = (name: string) => name.startsWith("auth/") || name.startsWith("guest/");

export const ResolvedLayout = (name: string) => {
    return (page: ReactNode) => {
        return <AppProviders>{isBare(name) ? page : <AppShell>{page}</AppShell>}</AppProviders>;
    };
};

/** Gives a resolved page component the layout for the page name it was asked for. */
export function withResolvedLayout(component: { layout?: (page: ReactNode) => ReactNode }, name: string) {
    component.layout = ResolvedLayout(name);

    return component;
}
