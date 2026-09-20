// --------------------------------------------------------- //
// LOGIC-GATES.ts
// --------------------------------------------------------- //

import NAND from "./nand.js";
import type { Bit } from "./transistor.js";

/**
 * The four basic logic gates, each built from NAND gates like in modern CPUs.
 * 
 */
export default class LogicGates {
    /**
     * NOT — tie both NAND inputs together.
     *
     *   A ──┬── NAND ── OUT
     *       │
     *   A ──┘
     *
     * NAND(A, A) inverts A:
     *   A=0 → NAND(0,0)=1
     *   A=1 → NAND(1,1)=0
     */
    static NOT(a: Bit): Bit {
        return NAND.gate(a, a);
    }

    /**
     * AND — a NAND followed by an inverter.
     *
     *   A ─┐
     *      NAND ── n ── NOT ── OUT
     *   B ─┘
     *
     * The NOT is another NAND with both inputs tied to `n`.
     */
    static AND(a: Bit, b: Bit): Bit {
        const n = NAND.gate(a, b);
        return NAND.gate(n, n);
    }

    /**
     * OR — De Morgan's law.
     *
     *   A OR B  ==  NOT( NOT(A) AND NOT(B) )
     *
     * Building the two NOTs and the AND directly from NAND:
     */
    static OR(a: Bit, b: Bit): Bit {
        const notA = NAND.gate(a, a);
        const notB = NAND.gate(b, b);
        return NAND.gate(notA, notB);
    }

    /**
     * XOR — four NANDs.
     *
     *   n1 = NAND(A, B)
     *   n2 = NAND(A, n1)
     *   n3 = NAND(B, n1)
     *   out = NAND(n2, n3)
     *
     * Check A=1, B=0:
     *   n1 = 1, n2 = NAND(1,1)=0, n3 = NAND(0,1)=1, out = NAND(0,1)=1
     */
    static XOR(a: Bit, b: Bit): Bit {
        const n1 = NAND.gate(a, b);
        const n2 = NAND.gate(a, n1);
        const n3 = NAND.gate(b, n1);
        return NAND.gate(n2, n3);
    }
}