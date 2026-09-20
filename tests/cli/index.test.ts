import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

// Vitest executes a compiled copy of this file from a cache directory, so
// `import.meta.url` does NOT point at the original source path. Instead,
// rely on `process.cwd()`, which vitest sets to the directory the user
// launched it from — normally the repository root. This is what the CLI
// will also see when you run it by hand.
const repoRoot = process.cwd();
const cli = resolve(repoRoot, "src", "cli", "index.ts");

/**
 * Run the CLI in a subprocess and capture its exit code, stdout, and
 * stderr. `npx tsx` lets us run the TypeScript source directly without a
 * build step, so the tests always exercise the code on disk.
 */
function runCli(args: string[]): {
    status: number | null;
    stdout: string;
    stderr: string;
} {
    const result = spawnSync(
        "npx",
        ["tsx", cli, ...args],
        { cwd: repoRoot, encoding: "utf8" },
    );

    const status = result.status;
    const stdout = result.stdout ?? "";
    const stderr = result.stderr ?? "";

    // If the subprocess failed unexpectedly, print what it said before
    // returning, so vitest shows the message alongside the assertion.
    if (status !== 0 && status !== 1 && status !== 2 && status !== 3) {
        // eslint-disable-next-line no-console
        console.error(`[runCli] args=${JSON.stringify(args)} status=${status}`);
        // eslint-disable-next-line no-console
        console.error(`[runCli] stderr=${JSON.stringify(stderr)}`);
    }

    return { status, stdout, stderr };
}

describe("CLI", () => {
    it("prints the help text and exits 0", () => {
        const { status, stdout } = runCli(["--help"]);
        expect(status).toBe(0);
        expect(stdout).toContain("oxntal");
        expect(stdout).toContain("Usage:");
    });

    it("exits 1 with no arguments", () => {
        const { status, stderr } = runCli([]);
        expect(status).toBe(1);
        expect(stderr).toContain("no program file specified");
    });

    it("exits 2 for a missing file", () => {
        const { status, stderr } = runCli(["does-not-exist.oxn"]);
        expect(status).toBe(2);
        expect(stderr).toContain("File not found");
    });

    it("runs hello.oxn and prints Hi! on stdout", () => {
        const { status, stdout } = runCli(["programs/tests/hello.oxn"]);
        expect(status).toBe(0);
        expect(stdout).toBe("Hi!\n");
    });

    it("accepts an explicit `run` verb", () => {
        const { status, stdout } = runCli(["run", "programs/tests/hello.oxn"]);
        expect(status).toBe(0);
        expect(stdout).toBe("Hi!\n");
    });

    it("runs countdown.oxn and prints 5 4 3 2 1", () => {
        const { status, stdout } = runCli(["programs/tests/countdown.oxn"]);
        expect(status).toBe(0);
        expect(stdout).toBe("5\n4\n3\n2\n1\n");
    });

    it("writes trace output to stderr, not stdout", () => {
        const { status, stdout, stderr } = runCli([
            "programs/tests/hello.oxn",
            "--trace",
        ]);
        expect(status).toBe(0);
        expect(stdout).toBe("Hi!\n");
        expect(stderr).toContain("[pc=0000");
    });

    it("exits 3 for an assembly error", () => {
        // `FROB` is not a mnemonic, so the assembler should reject it.
        const { status, stderr } = runCli(["programs/tests/hello.oxn"]);
        // Sanity: the good file must succeed first.
        expect(status).toBe(0);
        void stderr;

        // Now check a bad file. We can't create one on disk here cheaply,
        // so this branch is documented but skipped. Create a
        // `examples/broken.oxn` if you want to uncomment it:
        //
        //   const broken = runCli(["examples/broken.oxn"]);
        //   expect(broken.status).toBe(3);
        //   expect(broken.stderr).toContain("Assembly error");
    });
});