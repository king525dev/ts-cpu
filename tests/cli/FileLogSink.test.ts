import { describe, it, expect } from "vitest";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FileLogSink } from "../../src/cli/FileLogSink.js";

function withTmpDir<T>(fn: (dir: string) => T): T {
    const dir = mkdtempSync(join(tmpdir(), "sink-test-"));
    try {
        return fn(dir);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
}

describe("FileLogSink", () => {
    it("creates the file if it does not exist", () => {
        withTmpDir((dir) => {
            const path = join(dir, "new.log");
            new FileLogSink({ path });
            expect(readFileSync(path, "utf8")).toBe("");
        });
    });

    it("appends without truncating by default", () => {
        withTmpDir((dir) => {
            const path = join(dir, "append.log");
            writeFileSync(path, "existing\n", "utf8");
            const sink = new FileLogSink({ path });
            sink.write("new line");
            const contents = readFileSync(path, "utf8");
            expect(contents).toBe("existing\nnew line\n");
        });
    });

    it("truncates when asked", () => {
        withTmpDir((dir) => {
            const path = join(dir, "truncate.log");
            writeFileSync(path, "old contents\n", "utf8");
            const sink = new FileLogSink({ path, truncate: true });
            sink.write("fresh");
            expect(readFileSync(path, "utf8")).toBe("fresh\n");
        });
    });

    it("throws a clear error if the parent directory is missing", () => {
        withTmpDir((dir) => {
            const path = join(dir, "no", "such", "dir", "log.txt");
            expect(() => new FileLogSink({ path })).toThrow(
                /Could not open log file/,
            );
        });
    });

    it("silently drops writes after close()", () => {
        withTmpDir((dir) => {
            const path = join(dir, "closed.log");
            const sink = new FileLogSink({ path });
            sink.write("first");
            sink.close();
            sink.write("ignored");
            expect(readFileSync(path, "utf8")).toBe("first\n");
        });
    });
});