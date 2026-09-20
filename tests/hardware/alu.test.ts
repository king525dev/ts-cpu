import { describe, it, expect } from "vitest";
import ALU from "../../src/cpu/hardware/alu.js";

const alu = new ALU();

function expectSame(op: string, a: number, b: number): void {
    const expected = reference(op, a, b);
    const actual = alu.exec(op, a, b);
    if (actual !== expected) {
        throw new Error(
            `${op}(${a}, ${b}): expected ${expected}, got ${actual}`,
        );
    }
}

function reference(op: string, a: number, b: number): number {
    switch (op) {
        case "ADD": return (a + b) & 0xff;
        case "SUB": return (a - b) & 0xff;
        case "MUL": return (a * b) & 0xff;
        case "DIV": return b === 0 ? 0 : Math.floor(a / b) & 0xff;
        case "MOD": return b === 0 ? 0 : (a % b) & 0xff;
        case "AND": return (a & b) & 0xff;
        case "ORA": return (a | b) & 0xff;
        case "EOR": return (a ^ b) & 0xff;
        case "NOT": return (~a) & 0xff;
        case "INC": return (a + 1) & 0xff;
        case "DEC": return (a - 1) & 0xff;
        case "SHL": return (a << b) & 0xff;
        case "SHR": return (a >> b) & 0xff;
        case "NEG": return (-a) & 0xff;
        case "EQU": return a === b ? 1 : 0;
        case "GTH": return a > b ? 1 : 0;
        case "LTH": return a < b ? 1 : 0;
        default: throw new Error(`Unknown reference op: ${op}`);
    }
}

describe("ALU — exhaustive checks against reference semantics", () => {
    it("ADD matches for all 256×256 operand pairs", () => {
        for (let a = 0; a < 256; a++)
            for (let b = 0; b < 256; b++) expectSame("ADD", a, b);
    });

    it("SUB matches for all 256×256 operand pairs", () => {
        for (let a = 0; a < 256; a++)
            for (let b = 0; b < 256; b++) expectSame("SUB", a, b);
    });

    it("AND matches for all 256×256 operand pairs", () => {
        for (let a = 0; a < 256; a++)
            for (let b = 0; b < 256; b++) expectSame("AND", a, b);
    });

    it("ORA matches for all 256×256 operand pairs", () => {
        for (let a = 0; a < 256; a++)
            for (let b = 0; b < 256; b++) expectSame("ORA", a, b);
    });

    it("EOR matches for all 256×256 operand pairs", () => {
        for (let a = 0; a < 256; a++)
            for (let b = 0; b < 256; b++) expectSame("EOR", a, b);
    });

    it("EQU matches for all 256×256 operand pairs", () => {
        for (let a = 0; a < 256; a++)
            for (let b = 0; b < 256; b++) expectSame("EQU", a, b);
    });

    it("GTH matches for all 256×256 operand pairs", () => {
        for (let a = 0; a < 256; a++)
            for (let b = 0; b < 256; b++) expectSame("GTH", a, b);
    });

    it("LTH matches for all 256×256 operand pairs", () => {
        for (let a = 0; a < 256; a++)
            for (let b = 0; b < 256; b++) expectSame("LTH", a, b);
    });

    it("NOT matches for all 256 inputs", () => {
        for (let a = 0; a < 256; a++) expectSame("NOT", a, 0);
    });

    it("INC matches for all 256 inputs", () => {
        for (let a = 0; a < 256; a++) expectSame("INC", a, 0);
    });

    it("DEC matches for all 256 inputs", () => {
        for (let a = 0; a < 256; a++) expectSame("DEC", a, 0);
    });

    it("NEG matches for all 256 inputs", () => {
        for (let a = 0; a < 256; a++) expectSame("NEG", a, 0);
    });

    it("SHL matches for all 256 inputs and shifts 0–8", () => {
        for (let a = 0; a < 256; a++)
            for (let s = 0; s <= 8; s++) expectSame("SHL", a, s);
    });

    it("SHR matches for all 256 inputs and shifts 0–8", () => {
        for (let a = 0; a < 256; a++)
            for (let s = 0; s <= 8; s++) expectSame("SHR", a, s);
    });

    // MUL/DIV/MOD are slower because they use repeated addition/subtraction
    // internally. Test a 64×64 grid plus a handful of edge cases. That's
    // plenty of coverage without making the suite take minutes.
    it("MUL matches for 0–63 × 0–63 plus edge cases", () => {
        for (let a = 0; a < 64; a++)
            for (let b = 0; b < 64; b++) expectSame("MUL", a, b);
        for (const [a, b] of [
            [0, 255], [255, 0], [255, 1], [1, 255], [255, 255],
            [100, 100], [200, 3], [128, 2],
        ] as const) {
            expectSame("MUL", a, b);
        }
    });

    it("DIV matches for 0–63 ÷ 0–63 plus edge cases", () => {
        for (let a = 0; a < 64; a++)
            for (let b = 0; b < 64; b++) expectSame("DIV", a, b);
        for (const [a, b] of [
            [255, 1], [255, 2], [255, 255], [200, 7], [1, 0], [0, 0],
        ] as const) {
            expectSame("DIV", a, b);
        }
    });

    it("MOD matches for 0–63 mod 0–63 plus edge cases", () => {
        for (let a = 0; a < 64; a++)
            for (let b = 0; b < 64; b++) expectSame("MOD", a, b);
        for (const [a, b] of [
            [255, 7], [255, 255], [100, 3], [7, 7], [5, 0],
        ] as const) {
            expectSame("MOD", a, b);
        }
    });

    it("rejects unknown operations", () => {
        expect(() => alu.exec("FROBNICATE", 1, 2)).toThrow(/Unknown ALU op/);
    });
});