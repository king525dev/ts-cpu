import { describe, it, expect } from "vitest";
import NAND from "../../src/cpu/hardware/nand.js";

describe("NAND gate", () => {
    it("matches the NAND truth table", () => {
        expect(NAND.gate(0, 0)).toBe(1);
        expect(NAND.gate(0, 1)).toBe(1);
        expect(NAND.gate(1, 0)).toBe(1);
        expect(NAND.gate(1, 1)).toBe(0);
    });

    it("is commutative", () => {
        for (const a of [0, 1] as const) {
            for (const b of [0, 1] as const) {
                expect(NAND.gate(a, b)).toBe(NAND.gate(b, a));
            }
        }
    });
});