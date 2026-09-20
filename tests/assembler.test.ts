import { describe, it, expect } from "vitest";
import Assembler from "../src/cpu/assembler.js";

const asm = new Assembler();

describe("Assembler", () => {
    it("parses decimal and hex immediates", () => {
        expect(asm.assemble("LDA 10\nBRK")).toEqual([0x01, 10, 0xff]);
        expect(asm.assemble("LDA 0x0A\nBRK")).toEqual([0x01, 10, 0xff]);
        expect(asm.assemble("LDA 0b1010\nBRK")).toEqual([0x01, 10, 0xff]);
    });

    it("rejects unknown mnemonics' parameters", () => {
        expect(() => asm.assemble("LDA nope\nBRK")).toThrow();
    });

    it("expands LDA \"...\" multi-instruction", () => {
        expect(asm.assemble('LDA " 1 2 3 "\nBRK'))
            .toEqual([0x01, 1, 0x01, 2, 0x01, 3, 0xff]);
    });

    it("expands DUP * 3 repetition", () => {
        expect(asm.assemble("DUP * 3\nBRK"))
            .toEqual([0x06, 0x06, 0x06, 0xff]);
    });

    it("allocates variables from address 1 upward", () => {
        const bytes = asm.assemble("VAR x\nVAR y\nLDA x\nLDA y\nBRK");
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
        const bytes = asm.assemble(`
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
        expect(() => asm.assemble("VAR x\nVAR x\nBRK")).toThrow();
        expect(() => asm.assemble(">a\n>a\nBRK")).toThrow();
    });

    it("rejects an unterminated string", () => {
        expect(() => asm.assemble('LDA " 1 2 \nBRK')).toThrow();
    });
});