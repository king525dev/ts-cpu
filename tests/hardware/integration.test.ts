import { describe, it, expect } from "vitest";
import CPU from "../../src/cpu/cpu.js";
import Assembler from "../../src/cpu/assembler.js";
import type { CPUOutput, CPUDisplay } from "../../src/cpu/io.js";

function captureOutput() {
    const numbers: number[] = [];
    const chars: string[] = [];
    const errors: string[] = [];
    const output: CPUOutput = {
        writeNumber: (v) => numbers.push(v),
        writeChar: (c) => chars.push(c),
        writeStack: () => {},
        writeError: (m) => errors.push(m),
    };
    return { output, numbers, chars, errors };
}

function captureDisplay() {
    const tops: number[] = [];
    const stacks: number[][] = [];
    const display: CPUDisplay = {
        showTop: (v) => tops.push(v),
        printStack: (v) => stacks.push([...v]),
    };
    return { display, tops, stacks };
}

function run(source: string) {
    const bytecode = new Assembler().assemble(source);
    const out = captureOutput();
    const disp = captureDisplay();
    const cpu = new CPU(out.output, disp.display);
    cpu.load(bytecode);
    cpu.run();
    return {
        numbers: out.numbers,
        chars: out.chars,
        errors: out.errors,
        tops: disp.tops,
    };
}

describe("Full pipeline: assembler → CPU → gate-level ALU", () => {
    it("adds two constants end to end", () => {
        const { numbers } = run("LDA 10\nLDA 20\nADD\nOUT\nBRK");
        expect(numbers).toEqual([30]);
    });

    it("subtracts, multiplies, divides, and takes modulo", () => {
        const { numbers } = run(`
            LDA 20
            LDA 5
            SUB
            OUT

            LDA 6
            LDA 7
            MUL
            OUT

            LDA 84
            LDA 2
            DIV
            OUT

            LDA 17
            LDA 5
            MOD
            OUT

            BRK
        `);
        expect(numbers).toEqual([15, 42, 42, 2]);
    });

    it("bitwise operations still work", () => {
        const { numbers } = run(`
            LDA 0b1010
            LDA 0b1100
            AND
            OUT

            LDA 0b1010
            LDA 0b1100
            ORA
            OUT

            LDA 0b1010
            LDA 0b1100
            EOR
            OUT

            LDA 0b0000
            NOT
            OUT

            BRK
        `);
        expect(numbers).toEqual([0b1000, 0b1110, 0b0110, 0xff]);
    });

    it("INC, DEC, and NEG behave identically", () => {
        const { numbers } = run(`
            LDA 5
            INC
            OUT

            LDA 5
            DEC
            OUT

            LDA 5
            NEG
            OUT

            LDA 0
            DEC
            OUT

            BRK
        `);
        expect(numbers).toEqual([6, 4, 251, 255]);
    });

    it("SHL and SHR behave identically", () => {
        const { numbers } = run(`
            LDA 1
            LDA 4
            SHL
            OUT

            LDA 16
            LDA 2
            SHR
            OUT

            BRK
        `);
        expect(numbers).toEqual([16, 4]);
    });

    it("comparisons feed conditional jumps", () => {
        // Count down from 3 using GTH + JCN, which exercises the whole
        // comparison and control-flow path on top of the gate-level ALU.
        const { numbers } = run(`
            LDA 3
            STA 0x01
            >loop
            LDR 0x01
            OUT
            LDR 0x01
            DEC
            STA 0x01
            LDR 0x01
            LDA 0
            GTH
            JCN loop
            BRK
        `);
        expect(numbers).toEqual([3, 2, 1]);
    });

    it("EQU and LTH still produce the right flags", () => {
        const { numbers } = run(`
            LDA 7
            LDA 7
            EQU
            OUT

            LDA 3
            LDA 9
            LTH
            OUT

            LDA 9
            LDA 3
            LTH
            OUT

            BRK
        `);
        expect(numbers).toEqual([1, 1, 0]);
    });

    it("DCD still produces ASCII", () => {
        const { chars } = run(`
            LDA " 33 105 72 "
            DCD * 3
            BRK
        `);
        expect(chars.join("")).toBe("Hi!");
    });
});