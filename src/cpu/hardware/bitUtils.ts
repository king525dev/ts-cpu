// src/core/hardware/bitUtils.ts

import type { Bit } from "./transistor.js";

/**
 * An 8-bit value represented as eight individual wires, most significant
 * bit first.
 *
 * Index 0 = bit 7 (MSB)
 * Index 7 = bit 0 (LSB)
 */
export type Byte = [Bit, Bit, Bit, Bit, Bit, Bit, Bit, Bit];

/**
 * Split a number into its 8 bits, MSB first.
 *
 */
export function numberToByte(value: number): Byte {
    const v = value & 0xff;
    return [
        ((v >> 7) & 1) as Bit,
        ((v >> 6) & 1) as Bit,
        ((v >> 5) & 1) as Bit,
        ((v >> 4) & 1) as Bit,
        ((v >> 3) & 1) as Bit,
        ((v >> 2) & 1) as Bit,
        ((v >> 1) & 1) as Bit,
        (v & 1) as Bit,
    ];
}

/** Recombine eight bits, MSB first, into a number in the range 0–255. */
export function byteToNumber(byte: Byte): number {
    let out = 0;
    for (let i = 0; i < 8; i++) {
        out = (out << 1) | byte[i]!;
    }
    return out & 0xff;
}