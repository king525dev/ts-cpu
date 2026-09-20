// tests/cli/adapters.test.ts

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import NodeOutput from "../../src/cli/NodeOutput.js";
import TerminalDisplay from "../../src/cli/TerminalDisplay.js";

/**
 * Capture everything written to process.stdout / process.stderr by
 * replacing the `write` methods with spies. Vitest restores them in
 * `afterEach`, so tests stay independent.
 */
function captureStreams() {
    const stdout: string[] = [];
    const stderr: string[] = [];
    vi.spyOn(process.stdout, "write").mockImplementation((chunk: any) => {
        stdout.push(String(chunk));
        return true;
    });
    vi.spyOn(process.stderr, "write").mockImplementation((chunk: any) => {
        stderr.push(String(chunk));
        return true;
    });
    return { stdout, stderr };
}

afterEach(() => {
    vi.restoreAllMocks();
});

describe("NodeOutput", () => {
    let out: NodeOutput;
    beforeEach(() => {
        out = new NodeOutput();
    });

    it("writeNumber appends a newline to stdout", () => {
        const { stdout, stderr } = captureStreams();
        out.writeNumber(42);
        expect(stdout.join("")).toBe("42\n");
        expect(stderr.join("")).toBe("");
    });

    it("writeChar writes raw characters with no newline", () => {
        const { stdout } = captureStreams();
        out.writeChar("H");
        out.writeChar("i");
        out.writeChar("!");
        expect(stdout.join("")).toBe("Hi!");
    });

    it("writeStack formats values on one line", () => {
        const { stdout } = captureStreams();
        out.writeStack([1, 2, 3]);
        expect(stdout.join("")).toBe("[ 1 2 3 ]\n");
    });

    it("writeError goes to stderr, not stdout", () => {
        const { stdout, stderr } = captureStreams();
        out.writeError("boom");
        expect(stdout.join("")).toBe("");
        expect(stderr.join("")).toBe("boom\n");
    });
});

describe("TerminalDisplay", () => {
    let disp: TerminalDisplay;
    beforeEach(() => {
        disp = new TerminalDisplay();
    });

    it("showTop prints a bar followed by the value", () => {
        const { stdout } = captureStreams();
        disp.showTop(7);
        // Seven block characters, two spaces, the value, newline.
        expect(stdout.join("")).toBe("███████  7\n");
    });

    it("showTop caps the bar length for large values", () => {
        const { stdout } = captureStreams();
        disp.showTop(200);
        // Bar is capped at 60 characters, but the value is still shown.
        const line = stdout.join("");
        expect(line.startsWith("█".repeat(60))).toBe(true);
        expect(line.endsWith("  200\n")).toBe(true);
    });

    it("printStack labels each item and shows an empty message", () => {
        const { stdout } = captureStreams();
        disp.printStack([3, 5, 1]);
        const out = stdout.join("");
        expect(out).toContain("Stack:");
        expect(out).toContain("[  0]");
        expect(out).toContain("[  1]");
        expect(out).toContain("[  2]");
        expect(out).toContain("  3\n");
        expect(out).toContain("  5\n");
        expect(out).toContain("  1\n");
    });

    it("printStack handles an empty stack", () => {
        const { stdout } = captureStreams();
        disp.printStack([]);
        expect(stdout.join("")).toBe("Stack:\n  (empty)\n");
    });
});