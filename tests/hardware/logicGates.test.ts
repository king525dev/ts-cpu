import { describe, it, expect } from "vitest";
import LogicGates from "../../src/cpu/hardware/logicGates.js";

describe("NOT", () => {
    it("inverts", () => {
        expect(LogicGates.NOT(0)).toBe(1);
        expect(LogicGates.NOT(1)).toBe(0);
    });
});

describe("AND", () => {
    it("matches the AND truth table", () => {
        expect(LogicGates.AND(0, 0)).toBe(0);
        expect(LogicGates.AND(0, 1)).toBe(0);
        expect(LogicGates.AND(1, 0)).toBe(0);
        expect(LogicGates.AND(1, 1)).toBe(1);
    });
});

describe("OR", () => {
    it("matches the OR truth table", () => {
        expect(LogicGates.OR(0, 0)).toBe(0);
        expect(LogicGates.OR(0, 1)).toBe(1);
        expect(LogicGates.OR(1, 0)).toBe(1);
        expect(LogicGates.OR(1, 1)).toBe(1);
    });
});

describe("XOR", () => {
    it("matches the XOR truth table", () => {
        expect(LogicGates.XOR(0, 0)).toBe(0);
        expect(LogicGates.XOR(0, 1)).toBe(1);
        expect(LogicGates.XOR(1, 0)).toBe(1);
        expect(LogicGates.XOR(1, 1)).toBe(0);
    });
});