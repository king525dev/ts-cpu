// vite.config.ts

import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    build: {
        lib: {
            entry: resolve(here, "src/web/api.ts"),
            name: "Oxntal",
            fileName: (format) => `oxntal.${format}.js`,
            formats: ["es", "iife"],
        },
        outDir: "dist/web",
        emptyOutDir: true,
        sourcemap: true,
        // Set to 'esbuild' for production builds; false for readable output
        // during development.
        minify: false,
        target: "es2020",
    },
});