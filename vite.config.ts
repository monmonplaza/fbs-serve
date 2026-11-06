import inertia from "@inertiajs/vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import laravel from "laravel-vite-plugin";
import path from "path";
import { defineConfig } from "vite";

export default defineConfig({
    plugins: [
        laravel({
            input: ["resources/css/app.css", "resources/js/app.tsx"],
            refresh: true,
        }),
        react(),
        inertia(),
        tailwindcss(),
    ],
    server: {
        // The SQLite file/journal change on every request (sessions, cache); watching them full-reloads the page.
        watch: { ignored: ["**/database/*.sqlite*", "**/storage/**"] },
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./resources/js"),
        },
    },
});
