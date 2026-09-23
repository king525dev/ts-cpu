// Walks programs/ recursively and writes programs/manifest.json.
// Run this before opening the demo, or wire it into `prebuild`.

import { readdirSync, writeFileSync } from "node:fs";
import { resolve, relative, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const programsDir = resolve(root, "programs");

function walk(dir, base) {
    const out = [];
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
            out.push(...walk(full, base));
        } else if (entry.isFile() && entry.name.endsWith(".oxn")) {
            // Normalise to forward slashes so the browser doesn't care what
            // OS the manifest was generated on.
            out.push(relative(base, full).split(/[\\/]/).join("/"));
        }
    }
    return out;
}

const files = walk(programsDir, programsDir).sort();

writeFileSync(
    resolve(programsDir, "manifest.json"),
    JSON.stringify({ files }, null, 2) + "\n",
    "utf8",
);

console.log(
    `Wrote programs/manifest.json with ${files.length} program${
        files.length === 1 ? "" : "s"
    }.`,
);
for (const f of files) console.log("  " + f);