import { build } from "esbuild";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");

// Step 1: bundle src/cli/index.ts into a single CommonJS file.
// SEA works most reliably with CommonJS, even though your source is ESM.
// esbuild handles the conversion.
mkdirSync(resolve(root, "dist/sea"), { recursive: true });

await build({
    entryPoints: [resolve(root, "src/cli/index.ts")],
    outfile: resolve(root, "dist/sea/cli.cjs"),
    bundle: true,
    platform: "node",
    target: "node20",
    format: "cjs",
    // Node built-ins are provided by the runtime; don't bundle them.
    external: ["node:*"],
    // Keep the shebang so the generated binary knows how to run.
    banner: { js: "#!/usr/bin/env node" },
});

// Step 2: write the SEA config that Node.js will read.
const configPath = resolve(root, "dist/sea/sea-config.json");
writeFileSync(
    configPath,
    JSON.stringify(
        {
            main: resolve(root, "dist/sea/cli.cjs"),
            output: resolve(root, "dist/sea/mycpu.blob"),
            disableExperimentalSEAWarning: true,
        },
        null,
        2,
    ),
);

console.log("Bundled to dist/sea/cli.cjs");
console.log("SEA config at dist/sea/sea-config.json");