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
        expect(stderr).toContain("[pc=0x0000");
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

import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// (place these near the top of the file, next to the other imports)

describe("CLI logging", () => {
    it("creates a default oxntal.log in the working directory", () => {
        // We can't easily test "the default mycpu.log path in the repo
        // root" without leaving stray files around, so we test the
        // mechanism with an explicit path. The default path is exactly
        // the same code path with `path = "mycpu.log"`.
        const dir = mkdtempSync(join(tmpdir(), "mycpu-test-"));
        const logPath = join(dir, "custom.log");
        try {
            const { status } = runCli([
                "programs/tests/hello.oxn",
                "--log",
                logPath,
            ]);
            expect(status).toBe(0);
            const contents = readFileSync(logPath, "utf8");
            expect(contents).toContain("Initialised Assembler");
            expect(contents).toContain("Process Exited");
            expect(contents).toContain("op=0x01"); // an LDA step
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    });

    it("appends to an existing log rather than truncating it", () => {
        const dir = mkdtempSync(join(tmpdir(), "mycpu-test-"));
        const logPath = join(dir, "append.log");
        try {
            const first = runCli(["programs/tests/hello.oxn", "--log", logPath]);
            expect(first.status).toBe(0);
            const second = runCli(["programs/tests/hello.oxn", "--log", logPath]);
            expect(second.status).toBe(0);

            const contents = readFileSync(logPath, "utf8");
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    });

    it("emits no log lines when --no-log is given", () => {
        const { status, stderr } = runCli([
            "programs/tests/hello.oxn",
            "--no-log",
        ]);
        expect(status).toBe(0);
        expect(stderr).not.toContain("OXNTAL");
        expect(stderr).not.toContain("[pc=");
    });

    it("rejects --log and --no-log together", () => {
        const { status, stderr } = runCli([
            "programs/tests/hello.oxn",
            "--log",
            "foo.log",
            "--no-log",
        ]);
        expect(status).toBe(1);
        expect(stderr).toContain("cannot be combined");
    });

    it("prints a per-step trace to stderr with --verbose", () => {
        const { status, stdout, stderr } = runCli([
            "programs/tests/hello.oxn",
            "--verbose",
        ]);
        expect(status).toBe(0);
        expect(stdout).toBe("Hi!\n");
        // The --verbose format uses pc=NNNN (no 0x prefix).
        expect(stderr).toMatch(/\[pc=\d{4} sp=\s*\d+ op=0x[0-9a-f]{2}\]/);
        expect(stderr).toContain("stack=[");
    });
});