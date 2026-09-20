// src/core/hardware/adders.ts

import LogicGates from "./logicGates.js";
import type { Bit } from "./transistor.js";
import type { Byte } from "./bitUtils.js";

export interface AdderResult {
    sum: Bit;
    carry: Bit;
}

/**
 * Half adder: adds two bits, producing a sum and a carry.
 *
 *   SUM   = A XOR B
 *   CARRY = A AND B
 *
 * Truth table:
 *   A  B  | SUM CARRY
 *   0  0  |  0    0
 *   0  1  |  1    0
 *   1  0  |  1    0
 *   1  1  |  0    1
 *
 * (In binary: 1 + 1 = 10, so sum=0, carry=1.)
 */
export function halfAdder(a: Bit, b: Bit): AdderResult {
    return {
        sum: LogicGates.XOR(a, b),
        carry: LogicGates.AND(a, b),
    };
}

/**
 * Full adder: adds two bits plus an incoming carry, producing a sum and a
 * carry to the next column.
 *
 * Chain two half adders:
 *   first  = halfAdder(a, b)             — adds the two input bits
 *   second = halfAdder(first.sum, cin)   — adds the incoming carry
 *   carry  = first.carry OR second.carry
 *
 * The OR is needed because at most one of the two half adders can produce
 * a carry at a time (if both did, the total would be 4, which cannot fit
 * in a single bit column).
 */
export function fullAdder(a: Bit, b: Bit, carryIn: Bit): AdderResult {
    const first = halfAdder(a, b);
    const second = halfAdder(first.sum, carryIn);
    return {
        sum: second.sum,
        carry: LogicGates.OR(first.carry, second.carry),
    };
}

/**
 * Ripple-carry 8-bit adder.
 *
 * Eight full adders chained together, one per bit column. The carry out
 * of bit N feeds the carry in of bit N+1.
 *
 * The final carry out is discarded — this is how every 8-bit CPU behaves.
 * It is exactly what `(a + b) & 0xff` does in JavaScript.
 *
 * We process bits from LSB (index 7) to MSB (index 0) so that each
 * column's carry is available for the next one.
 */
export function addBytes(a: Byte, b: Byte): Byte {
    const result: Bit[] = [0, 0, 0, 0, 0, 0, 0, 0];
    let carry: Bit = 0;
    for (let i = 7; i >= 0; i--) {
        const r = fullAdder(a[i]!, b[i]!, carry);
        result[i] = r.sum;
        carry = r.carry;
    }
    return result as Byte;
}