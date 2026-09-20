import { describe, it, expect } from "vitest";
import {
    NTypeTransistor,
    PTypeTransistor,
} from "../../src/cpu/hardware/transistor.js";

describe("NTypeTransistor", () => {
    it("conducts only when its gate is 1", () => {
        expect(new NTypeTransistor(0).conducts()).toBe(false);
        expect(new NTypeTransistor(1).conducts()).toBe(true);
    });

    it("passes a signal only when conducting", () => {
        expect(new NTypeTransistor(0).pass(1)).toBe(0);
        expect(new NTypeTransistor(1).pass(1)).toBe(1);
        expect(new NTypeTransistor(0).pass(0)).toBe(0);
        expect(new NTypeTransistor(1).pass(0)).toBe(0);
    });
});

describe("PTypeTransistor", () => {
    it("conducts only when its gate is 0", () => {
        expect(new PTypeTransistor(0).conducts()).toBe(true);
        expect(new PTypeTransistor(1).conducts()).toBe(false);
    });

    it("passes a signal only when conducting", () => {
        expect(new PTypeTransistor(0).pass(1)).toBe(1);
        expect(new PTypeTransistor(1).pass(1)).toBe(0);
        expect(new PTypeTransistor(0).pass(0)).toBe(0);
        expect(new PTypeTransistor(1).pass(0)).toBe(0);
    });
});