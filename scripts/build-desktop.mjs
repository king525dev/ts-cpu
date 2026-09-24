import { build } from "esbuild";
import {
    copyFileSync,
    mkdirSync,
    rmSync,
} from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const outDir = resolve(root, "dist/desktop");

// Wipe previous output so stale files never ship by accident.
rmSync(outDir, { recursive: true, force: true });
mkdirSync(resolve(outDir, "renderer"), { recursive: true });

// ---- Main process → CommonJS ----
await build({
    entryPoints: [resolve(root, "src/desktop/main.ts")],
    outfile: resolve(outDir, "main.cjs"),
    bundle: true,
    platform: "node",
    target: "node20",
    format: "cjs",
    // Electron is provided by the runtime, not bundled.
    external: ["electron"],
});

// ---- Renderer → IIFE ----
await build({
    entryPoints: [resolve(root, "src/desktop/renderer/app.ts")],
    outfile: resolve(outDir, "renderer", "app.js"),
    bundle: true,
    platform: "browser",
    target: "es2020",
    format: "iife",
    sourcemap: false,
    minify: false,
});

// ---- Static files ----
copyFileSync(
    resolve(root, "src/desktop/renderer/index.html"),
    resolve(outDir, "renderer", "index.html"),
);
copyFileSync(
    resolve(root, "src/desktop/renderer/styles.css"),
    resolve(outDir, "renderer", "styles.css"),
);

console.log("Desktop build complete → dist/desktop/");