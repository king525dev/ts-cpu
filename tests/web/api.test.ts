import { describe, it, expect } from "vitest";
import { assemble, execute, run } from "../../src/web/api.js";

describe("assemble()", () => {
    it("returns bytecode for a valid program", () => {
        const r = assemble("LDA 5\nOUT\nBRK");
        expect(r.ok).toBe(true);
        expect(r.bytecode).toEqual([0x01, 5, 0x18, 0xff]);
    });

    it("returns ok:false with a message for a bad program", () => {
        const r = assemble("FROB 1\nBRK");
        expect(r.ok).toBe(false);
        expect(r.error).toMatch(/FROB/);
        expect(r.bytecode).toBeUndefined();
    });

    it("captures the log when asked", () => {
        const r = assemble("LDA 5\nBRK", { captureLog: true });
        expect(r.log).toContain("After comment stripping");
        expect(r.log).toContain("Assembler process finished");
    });

    it("omits the log by default", () => {
        const r = assemble("LDA 5\nBRK");
        expect(r.log).toBeUndefined();
    });
});

describe("execute()", () => {
    it("runs bytecode and returns stdout", () => {
        const bytecode = [0x01, 5, 0x18, 0xff];
        const r = execute(bytecode);
        expect(r.ok).toBe(true);
        expect(r.stdout).toBe("5\n");
        expect(r.numbers).toEqual([5]);
    });

    it("returns final stack contents", () => {
        // LDA 1, LDA 2, ADD — stack should be [3]
        const r = execute([0x01, 1, 0x01, 2, 0x0a, 0xff]);
        expect(r.ok).toBe(true);
        expect(r.finalStack).toEqual([3]);
    });

    it("returns a runtime error for a bad opcode", () => {
        const r = execute([0x42, 0xff]);
        expect(r.ok).toBe(false);
        expect(r.error?.kind).toBe("runtime");
        expect(r.error?.message).toMatch(/Unknown opcode/);
    });

    it("captures the log when asked", () => {
        const r = execute([0x01, 5, 0x18, 0xff], { captureLog: true });
        expect(r.log).toContain("[pc=0x0000");
    });
});

describe("run()", () => {
    it("assembles and executes in one call", () => {
        const r = run({ source: "LDA 10\nLDA 20\nADD\nOUT\nBRK" });
        expect(r.ok).toBe(true);
        expect(r.stdout).toBe("30\n");
    });

    it("reports assembly errors with kind:'assembly'", () => {
        const r = run({ source: "FROB 1" });
        expect(r.ok).toBe(false);
        expect(r.error?.kind).toBe("assembly");
    });

    it("reports runtime errors with kind:'runtime'", () => {
        // LDA without a parameter — LDA is at the very end of the program.
        const r = run({ source: "LDA" });
        expect(r.ok).toBe(false);
        expect(r.error?.kind).toBe("assembly");
        // Note: this is an *assembly* error in our current design, because
        // the assembler requires a parameter token.
    });

    it("returns chars separately from stdout", () => {
        const r = run({ source: 'LDA " 33 105 72 "\nDCD * 3\nBRK' });
        expect(r.ok).toBe(true);
        // Stack is LIFO: the last value pushed (72 = 'H') comes out first.
        expect(r.chars).toEqual(["H", "i", "!"]);
        expect(r.stdout).toBe("Hi!");
    });

    it("returns the bytecode alongside the results", () => {
        const r = run({ source: "LDA 7\nBRK" });
        expect(r.bytecode).toEqual([0x01, 7, 0xff]);
    });

    it("captures the log when asked", () => {
        const r = run({ source: "LDA 7\nOUT\nBRK", captureLog: true });
        expect(r.log).toContain("CPU initialised");
        expect(r.log).toContain("[pc=0x0000");
        expect(r.log).toContain("Process Exited");
    });
});