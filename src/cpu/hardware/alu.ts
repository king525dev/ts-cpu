// --------------------------------------------------------- //
// ALU.ts
// --------------------------------------------------------- //

import LogicGates from "./logicGates.js";
import type { Bit } from "./transistor.js";
import { type Byte, numberToByte, byteToNumber } from "./bitUtils.js";
import { addBytes } from "./adders.js";

// ---------------------------------------------------------------------
// Small helpers for byte-wide operations built from single-bit gates.
// ---------------------------------------------------------------------

function byteAnd(a: Byte, b: Byte): Byte {
    const r: Bit[] = [];
    for (let i = 0; i < 8; i++) r.push(LogicGates.AND(a[i]!, b[i]!));
    return r as Byte;
}

function byteOr(a: Byte, b: Byte): Byte {
    const r: Bit[] = [];
    for (let i = 0; i < 8; i++) r.push(LogicGates.OR(a[i]!, b[i]!));
    return r as Byte;
}

function byteXor(a: Byte, b: Byte): Byte {
    const r: Bit[] = [];
    for (let i = 0; i < 8; i++) r.push(LogicGates.XOR(a[i]!, b[i]!));
    return r as Byte;
}

function byteNot(a: Byte): Byte {
    const r: Bit[] = [];
    for (let i = 0; i < 8; i++) r.push(LogicGates.NOT(a[i]!));
    return r as Byte;
}

const ZERO: Byte = [0, 0, 0, 0, 0, 0, 0, 0];
const ONE: Byte  = [0, 0, 0, 0, 0, 0, 0, 1];

// ---------------------------------------------------------------------
// Arithmetic — every operation built from the 8-bit adder.
// ---------------------------------------------------------------------

/**
 * Subtraction via two's complement.
 *
 *   A - B  =  A + NOT(B) + 1
 *
 */
function subBytes(a: Byte, b: Byte): Byte {
    const notB = byteNot(b);
    const negB = addBytes(notB, ONE);
    return addBytes(a, negB);
}

/**
 * Multiplication by repeated addition.
 *
 * A real 8×8 multiplier is a large array of adders (a "Wallace tree").
 * We use repeated addition for the same result with far less code. Every
 * step still goes through the 8-bit adder, so MUL ultimately depends on
 * gates, NAND, and transistors just like ADD does.
 */
function mulBytes(a: Byte, b: Byte): Byte {
    const times = byteToNumber(b);
    let result: Byte = ZERO;
    for (let i = 0; i < times; i++) {
        result = addBytes(result, a);
    }
    return result;
}

/** Unsigned comparison: is `a` strictly less than `b`? */
function byteLessThan(a: Byte, b: Byte): Bit {
    return byteGreaterThan(b, a);
}

/**
 * Unsigned comparison: is `a` strictly greater than `b`?
 *
 * Compare from MSB to LSB. At the first position where the bits differ,
 * the value with a 1 wins. We track whether all higher bits have been
 * equal so far; a 1 in `a` only counts if nothing above it already
 * decided the comparison.
 */
function byteGreaterThan(a: Byte, b: Byte): Bit {
    let result: Bit = 0;
    let higherEqual: Bit = 1;
    for (let i = 0; i < 8; i++) {
        const aBit = a[i]!;
        const bBit = b[i]!;
        const aBitSetBUnset = LogicGates.AND(aBit, LogicGates.NOT(bBit));
        const thisWins = LogicGates.AND(higherEqual, aBitSetBUnset);
        result = LogicGates.OR(result, thisWins);
        // Update higherEqual: higherEqual AND (aBit == bBit)
        const bitsEqual = LogicGates.NOT(LogicGates.XOR(aBit, bBit));
        higherEqual = LogicGates.AND(higherEqual, bitsEqual);
    }
    return result;
}

function byteEqual(a: Byte, b: Byte): Bit {
    let result: Bit = 1;
    for (let i = 0; i < 8; i++) {
        const bitsEqual = LogicGates.NOT(LogicGates.XOR(a[i]!, b[i]!));
        result = LogicGates.AND(result, bitsEqual);
    }
    return result;
}

function divBytes(a: Byte, b: Byte): Byte {
    if (byteToNumber(b) === 0) return ZERO;
    let remainder = a;
    let count: Byte = ZERO;
    // While remainder >= b (i.e. NOT remainder < b): remainder -= b; count++
    while (byteLessThan(remainder, b) === 0) {
        remainder = subBytes(remainder, b);
        count = addBytes(count, ONE);
    }
    return count;
}

function modBytes(a: Byte, b: Byte): Byte {
    if (byteToNumber(b) === 0) return ZERO;
    let remainder = a;
    while (byteLessThan(remainder, b) === 0) {
        remainder = subBytes(remainder, b);
    }
    return remainder;
}

function negBytes(a: Byte): Byte {
    return addBytes(byteNot(a), ONE);
}

function shlBytes(a: Byte, b: Byte): Byte {
    const shift = byteToNumber(b);
    if (shift >= 8) return ZERO;
    const result: Bit[] = [0, 0, 0, 0, 0, 0, 0, 0];
    for (let i = 0; i < 8 - shift; i++) {
        result[i] = a[i + shift]!;
    }
    return result as Byte;
}

function shrBytes(a: Byte, b: Byte): Byte {
    const shift = byteToNumber(b);
    if (shift >= 8) return ZERO;
    const result: Bit[] = [0, 0, 0, 0, 0, 0, 0, 0];
    for (let i = shift; i < 8; i++) {
        result[i] = a[i - shift]!;
    }
    return result as Byte;
}

// ---------------------------------------------------------------------
// The ALU.
// ---------------------------------------------------------------------

/**
 * The Arithmetic Logic Unit.
 *
 * Externally, the ALU looks the same as it always has: `exec(op, a, b)`
 * takes a mnemonic and two numbers, and returns a number in the range
 * 0–255. Internally, every operation routes through the layered hardware
 * modules above — nothing in this file uses native arithmetic operators
 * on the operands themselves.
 *
 * The only place native bitwise operators appear is `bitUtils`, and only
 * for splitting a number into bits and back. That's a wiring concern,
 * not a computation.
 */
export default class ALU {
    exec(op: string, a: number, b: number = 0): number {
        const A = numberToByte(a);
        const B = numberToByte(b);

        switch (op) {
            case "ADD": return byteToNumber(addBytes(A, B));
            case "SUB": return byteToNumber(subBytes(A, B));
            case "MUL": return byteToNumber(mulBytes(A, B));
            case "DIV": return byteToNumber(divBytes(A, B));
            case "MOD": return byteToNumber(modBytes(A, B));
            case "AND": return byteToNumber(byteAnd(A, B));
            case "ORA": return byteToNumber(byteOr(A, B));
            case "EOR": return byteToNumber(byteXor(A, B));
            case "NOT": return byteToNumber(byteNot(A));
            case "INC": return byteToNumber(addBytes(A, ONE));
            case "DEC": return byteToNumber(subBytes(A, ONE));
            case "SHL": return byteToNumber(shlBytes(A, B));
            case "SHR": return byteToNumber(shrBytes(A, B));
            case "NEG": return byteToNumber(negBytes(A));
            case "EQU": return byteEqual(A, B);
            case "GTH": return byteGreaterThan(A, B);
            case "LTH": return byteLessThan(A, B);
            default: throw new Error(`Unknown ALU op: ${op}`);
        }
    }
}