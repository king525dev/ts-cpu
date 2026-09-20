import { describe, it, expect } from "vitest";
import { halfAdder, fullAdder, addBytes } from "../../src/cpu/hardware/adders.js";
import { numberToByte, byteToNumber } from "../../src/cpu/hardware/bitUtils.js";
import type { Bit } from "../../src/cpu/hardware/transistor.js";

describe("halfAdder", () => {
    it("matches the half-adder truth table", () => {
        const cases: Array<[Bit, Bit, Bit, Bit]> = [
            [0, 0, 0, 0],
            [0, 1, 1, 0],
            [1, 0, 1, 0],
            [1, 1, 0, 1],
        ];
        for (const [a, b, sum, carry] of cases) {
            const r = halfAdder(a, b);
            expect(r.sum).toBe(sum);
            expect(r.carry).toBe(carry);
        }
    });
});

describe("fullAdder", () => {
    it("matches the full-adder truth table", () => {
        // a + b + cin, sum and carry-out as 2-bit binary
        const cases: Array<[Bit, Bit, Bit, Bit, Bit]> = [
            [0, 0, 0, 0, 0],
            [0, 0, 1, 1, 0],
            [0, 1, 0, 1, 0],
            [0, 1, 1, 0, 1],
            [1, 0, 0, 1, 0],
            [1, 0, 1, 0, 1],
            [1, 1, 0, 0, 1],
            [1, 1, 1, 1, 1],
        ];
        for (const [a, b, cin, sum, carry] of cases) {
            const r = fullAdder(a, b, cin);
            expect(r.sum).toBe(sum);
            expect(r.carry).toBe(carry);
        }
    });
});

describe("addBytes", () => {
    it("adds two 8-bit values with wraparound", () => {
        for (let a = 0; a < 256; a++) {
            for (let b = 0; b < 256; b++) {
                const result = byteToNumber(
                    addBytes(numberToByte(a), numberToByte(b)),
                );
                expect(result).toBe((a + b) & 0xff);
            }
        }
    });
});