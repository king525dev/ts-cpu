// --------------------------------------------------------- //
// NAND.ts
// --------------------------------------------------------- //

import { NTypeTransistor, PTypeTransistor, type Bit } from "./transistor.js";

/**
 * A 2-input NAND gate built from four CMOS transistors.
 *
 * Layout (standard CMOS NAND):
 *
 *              Vdd (1)
 *                │
 *          ┌─────┴─────┐
 *          │           │
 *       PMOS(A)     PMOS(B)      ← pull-up network (parallel)
 *          │           │
 *          └─────┬─────┘
 *                │
 *                ├─────── OUT
 *                │
 *          ┌─────┴─────┐
 *              NMOS(A)
 *                │
 *              NMOS(B)           ← pull-down network (series)
 *                │
 *              GND (0)
 *
 *
 *   * The PMOS pair is *parallel*. If either A or B is LOW, at least one
 *     PMOS conducts, connecting the output to Vdd. So the output is HIGH
 *     whenever NOT(A AND B).
 *
 *   * The NMOS pair is *series*. Both must conduct for the output to be
 *     pulled to ground. Both conduct only when A AND B are both HIGH.
 *
 * The two networks are complementary: for any input, exactly one conducts.
 *
 * Truth table:
 *   A  B  | OUT
 *   0  0  |  1
 *   0  1  |  1
 *   1  0  |  1
 *   1  1  |  0
 */
export default class NAND {
    static gate(a: Bit, b: Bit): Bit {
        // ---- Pull-up network: two PMOS in parallel ----
        // Each PMOS conducts when its gate is LOW.
        const pmosA = new PTypeTransistor(a);
        const pmosB = new PTypeTransistor(b);
        const pullUp = pmosA.conducts() || pmosB.conducts();

        // ---- Pull-down network: two NMOS in series ----
        // Each NMOS conducts when its gate is HIGH.
        const nmosA = new NTypeTransistor(a);
        const nmosB = new NTypeTransistor(b);
        const pullDown = nmosA.conducts() && nmosB.conducts();

        // A well-formed CMOS gate always has exactly one network on.
        // If both are on (short circuit) or both are off (floating output),
        // something is wrong with the circuit. Fail loudly rather than
        // silently returning a wrong bit.
        if (pullUp === pullDown) {
            throw new Error(
                `Invalid CMOS NAND state: pullUp=${pullUp}, pullDown=${pullDown}`,
            );
        }

        return pullUp ? 1 : 0;
    }
}