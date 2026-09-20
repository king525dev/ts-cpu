// src/cli/TerminalDisplay.ts

import type { CPUDisplay } from "../cpu/io.js";

/**
 * Terminal implementation of CPUDisplay.
 *
 * The core CPU calls `showTop(value)` and `printStack(values)` for the SHW
 * and PRT opcodes. In a browser these are backed by a <canvas>. In a
 * terminal, we render simple ASCII bar charts.
 *
 * The bar character `█` (U+2588, FULL BLOCK) renders correctly in modern
 * terminals on all three platforms. If a user is on an older Windows
 * console that shows it as a box, replace it with `#`.
 *
 * The bar length is capped at MAX_BAR so a value of 255 doesn't wreck the
 * layout. The numeric value is always shown after the bar, so no
 * information is lost.
 */
const BAR_CHAR = "█";
const MAX_BAR = 60;

export default class TerminalDisplay implements CPUDisplay {
    /**
     * Render the current top-of-stack value as a single horizontal bar
     * (SHW, 0x1B). Example for value 7:
     *
     *   ███████  7
     */
    showTop(value: number): void {
        const width = Math.min(value, MAX_BAR);
        process.stdout.write(BAR_CHAR.repeat(width) + "  " + value + "\n");
    }

    /**
     * Render the full stack as a labelled bar chart (PRT, 0x1A). Example
     * for a stack `[3, 5, 1]`:
     *
     *   Stack:
     *     [  0]  ███  3
     *     [  1]  █████  5
     *     [  2]  █  1
     *
     * An empty stack prints `Stack: (empty)`.
     */
    printStack(values: readonly number[]): void {
        process.stdout.write("Stack:\n");
        if (values.length === 0) {
            process.stdout.write("  (empty)\n");
            return;
        }
        values.forEach((value, index) => {
            const width = Math.min(value, MAX_BAR);
            const label = index.toString().padStart(3);
            const bar = BAR_CHAR.repeat(width);
            process.stdout.write(`  [${label}]  ${bar}  ${value}\n`);
        });
    }
}