import { describe, it, expect } from "vitest";
import CPU from "../src/cpu/cpu.js";
import Assembler from "../src/cpu/assembler.js";
import type { CPUOutput, CPUDisplay } from "../src/cpu/io.js";

/**
 * Captures everything the CPU sends out. This is the whole reason for the
 * adapter design: no terminal, no DOM, just an array.
 */
function makeCaptureOutput() {
    const numbers: number[] = [];
    const chars: string[] = [];
    const stacks: number[][] = [];
    const errors: string[] = [];
    const output: CPUOutput = {
        writeNumber: (v) => numbers.push(v),
        writeChar: (c) => chars.push(c),
        writeStack: (v) => stacks.push([...v]),
        writeError: (m) => errors.push(m),
    };
    return { output, numbers, chars, stacks, errors };
}

function makeCaptureDisplay() {
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
    const out = makeCaptureOutput();
    const disp = makeCaptureDisplay();
    const cpu = new CPU(out.output, disp.display);
    cpu.load(bytecode);
    cpu.run();
    return { ...out, ...disp, cpu };
}

describe("CPU", () => {
    it("pushes and outputs a number", () => {
        const { numbers } = run("LDA 42\nOUT\nBRK");
        expect(numbers).toEqual([42]);
    });

    it("outputs an ASCII character via DCD", () => {
        const { chars } = run("LDA 65\nDCD\nBRK");
        expect(chars.join("")).toBe("A");
    });

    it("calls display.showTop on SHW", () => {
        const { tops } = run("LDA 99\nSHW\nBRK");
        expect(tops).toEqual([99]);
    });

    it("calls display.printStack on PRT", () => {
        const { stacks } = run("LDA 1\nLDA 2\nLDA 3\nPRT\nBRK");
        expect(stacks).toEqual([[1, 2, 3]]);
    });

    it("calls output.writeStack on LOG", () => {
        const { stacks } = run("LDA 7\nLDA 8\nLOG\nBRK");
        expect(stacks).toEqual([[7, 8]]);
    });

    it("stores and loads from RAM", () => {
        const { numbers } = run(`
            LDA 7
            STA 0x10
            LDR 0x10
            OUT
            BRK
        `);
        expect(numbers).toEqual([7]);
    });

    it("loops until a counter reaches zero", () => {
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
            JCN loop
            BRK
        `);
        expect(numbers).toEqual([3, 2, 1]);
    });

    it("resolves a VAR address through LDR/STA", () => {
        const { numbers } = run(`
            VAR x
            LDA 12
            STA x
            LDR x
            OUT
            BRK
        `);
        expect(numbers).toEqual([12]);
    });

    it("throws on an unknown opcode", () => {
        const cpu = new CPU();
        cpu.load([0x42]); // 0x42 is not assigned
        cpu.running = true;
        expect(() => cpu.step()).toThrow(/Unknown opcode/);
    });
});