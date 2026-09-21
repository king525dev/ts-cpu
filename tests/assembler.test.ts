import { describe, it, expect } from "vitest";
import Assembler from "../src/cpu/assembler.js";
import Logger, { type LogSink, nullSink } from "../src/cpu/logger.js";

const oxn = new Assembler();

function makeStringSink() {
    const lines: string[] = [];
    const sink: LogSink = { write: (l) => lines.push(l) };
    const logger = new Logger({ sink, timestampFormat: () => "TS" });
    return { logger, text: () => lines.join("\n") };
}

describe("Assembler", () => {
    it("parses decimal and hex immediates", () => {
        expect(oxn.assemble("LDA 10\nBRK")).toEqual([0x01, 10, 0xff]);
        expect(oxn.assemble("LDA 0x0A\nBRK")).toEqual([0x01, 10, 0xff]);
        expect(oxn.assemble("LDA 0b1010\nBRK")).toEqual([0x01, 10, 0xff]);
    });

    it("rejects unknown mnemonics' parameters", () => {
        expect(() => oxn.assemble("LDA nope\nBRK")).toThrow();
    });

    it("expands LDA \"...\" multi-instruction", () => {
        expect(oxn.assemble('LDA " 1 2 3 "\nBRK'))
            .toEqual([0x01, 1, 0x01, 2, 0x01, 3, 0xff]);
    });

    it("expands DUP * 3 repetition", () => {
        expect(oxn.assemble("DUP * 3\nBRK"))
            .toEqual([0x06, 0x06, 0x06, 0xff]);
    });

    it("allocates variables from address 1 upward", () => {
        const bytes = oxn.assemble("VAR x\nVAR y\nLDA x\nLDA y\nBRK");
        // LDA x  →  0x01 0x01
        // LDA y  →  0x01 0x02
        expect(bytes).toEqual([0x01, 1, 0x01, 2, 0xff]);
    });

    it("resolves a code label to the correct bytecode address", () => {
        // The instruction after `>loop` is at bytecode address 8:
        //   LDA 5  →  bytes 0-1
        //   LDA 6  →  bytes 2-3
        //   LDA 7  →  bytes 4-5
        //   LDA 8  →  bytes 6-7
        //   >loop  →  bytecodeAddress = 8
        //   LDA 9  →  bytes 8-9
        //   JMP loop  →  0x1E 0x08
        const bytes = oxn.assemble(`
            LDA 5
            LDA 6
            LDA 7
            LDA 8
            >loop
            LDA 9
            JMP loop
            BRK
        `);
        // Last-but-one bytes: JMP opcode (0x1E) then the resolved address 8.
        expect(bytes.slice(-3)).toEqual([0x1E, 8, 0xff]);
    });

    it("rejects duplicate symbols", () => {
        expect(() => oxn.assemble("VAR x\nVAR x\nBRK")).toThrow();
        expect(() => oxn.assemble(">a\n>a\nBRK")).toThrow();
    });

    it("rejects an unterminated string", () => {
        expect(() => oxn.assemble('LDA " 1 2 \nBRK')).toThrow();
    });
});

describe("Assembler logging", () => {
    it("logs tokens after comment stripping", () => {
        const { logger, text } = makeStringSink();
        const asm = new Assembler(logger);
        asm.assemble("LDA 5 // push five //\nBRK");
        expect(text()).toContain("After comment stripping: [ LDA 5 BRK ]");
    });

    it("logs tokens after expansion", () => {
        const { logger, text } = makeStringSink();
        const asm = new Assembler(logger);
        asm.assemble('LDA " 1 2 3 "\nBRK');
        expect(text()).toContain(
            "After expansion: [ LDA 1 LDA 2 LDA 3 BRK ]",
        );
    });

    it("logs variable allocations", () => {
        const { logger, text } = makeStringSink();
        const asm = new Assembler(logger);
        asm.assemble("VAR x\nVAR y\nBRK");
        const joined = text();
        expect(joined).toContain("Assigned 'x' to RAM address 0x01");
        expect(joined).toContain("Assigned 'y' to RAM address 0x02");
    });

    it("logs label declarations with their bytecode address", () => {
        const { logger, text } = makeStringSink();
        const asm = new Assembler(logger);
        // LDA 5  → bytes 0-1
        // LDA 6  → bytes 2-3
        // >loop  → bytecode address 4
        asm.assemble("LDA 5\nLDA 6\n>loop\nBRK");
        expect(text()).toContain("Label 'loop' at bytecode 0x0004");
    });

    it("dumps the symbol table", () => {
        const { logger, text } = makeStringSink();
        const asm = new Assembler(logger);
        asm.assemble("VAR x\n>start\nLDA x\nJMP start\nBRK");
        const joined = text();
        expect(joined).toContain("Symbol table:");
        expect(joined).toContain("var   x -> 0x01");
        expect(joined).toContain("label start -> 0x0000");
    });

    it("logs a variable reference during emission", () => {
        const { logger, text } = makeStringSink();
        const asm = new Assembler(logger);
        asm.assemble("VAR x\nLDA x\nBRK");
        expect(text()).toContain("Referenced var 'x' (0x01)");
    });

    it("logs a label reference during emission", () => {
        const { logger, text } = makeStringSink();
        const asm = new Assembler(logger);
        asm.assemble(">loop\nJMP loop\nBRK");
        expect(text()).toContain("Referenced label 'loop' (0x0000)");
    });
});