// --------------------------------------------------------- //
// TRANSISTOR.ts
// --------------------------------------------------------- //

/**
 * A single binary digit. 0 = low / off / false. 1 = high / on / true.
 *
 */
export type Bit = 0 | 1;

/**
 * N-type MOSFET (NMOS).
 *
 *   conducts when its gate is HIGH (1).
 *   blocks   when its gate is LOW  (0).
 *
 * In CMOS circuits, NMOS transistors form the "pull-down" network — when
 * they conduct, they connect the output to ground (0).
 *
 * The transistor is modelled as a swtich. A real MOSFET has a
 * gate-threshold voltage and a resistance that varies with gate voltage;
 * that is not relevant to me, so it has been left out. What's left is the digital
 * abstraction, which is what every CPU design ultimately relies on.
 */
export class NTypeTransistor {
    constructor(public readonly gate: Bit) {}

    /** True when the transistor is conducting (closed switch). */
    conducts(): boolean {
        return this.gate === 1;
    }

    /**
     * Pass a signal through the transistor.
     * If the transistor is off, the output is blocked and reads as 0.
     */
    pass(signal: Bit): Bit {
        return this.gate === 1 ? signal : 0;
    }
}

/**
 * P-type MOSFET (PMOS).
 *
 *   conducts when its gate is LOW  (0).
 *   blocks   when its gate is HIGH (1).
 *
 * PMOS transistors form the "pull-up" network — when they conduct, they
 * connect the output to the positive supply (1).
 *
 * The complementary behaviour of NMOS and PMOS is the whole reason CMOS
 * gates consume almost no power in a steady state: exactly one of the two
 * networks conducts at any time.
 */
export class PTypeTransistor {
    constructor(public readonly gate: Bit) {}

    /** True when the transistor is conducting (closed switch). */
    conducts(): boolean {
        return this.gate === 0;
    }

    /** Pass a signal through the transistor, or 0 if it is off. */
    pass(signal: Bit): Bit {
        return this.gate === 0 ? signal : 0;
    }
}