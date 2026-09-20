// src/cli/NodeOutput.ts

import type { CPUOutput } from "../cpu/io.js";

/**
 * Terminal implementation of CPUOutput.
 *
 *   * writeNumber / writeChar / writeStack  →  process.stdout
 *   * writeError                            →  process.stderr
 *
 * Keeping normal output and errors on separate streams matters for shells:
 * a user can redirect program output without losing the error messages, and
 * `mycpu foo.asm > out.txt` behaves as expected.
 *
 * This is the *only* file in the project that writes to process.stdout for
 * CPU output. Every other frontend (Electron, web) provides its own
 * CPUOutput implementation. The core never imports this file.
 */
export default class NodeOutput implements CPUOutput {
    /**
     * Print a number followed by a newline (OUT, 0x18).
     * Matches the original terminal behaviour, where each OUT was on its
     * own line, so existing programs produce the same visible output.
     */
    writeNumber(value: number): void {
        process.stdout.write(value.toString() + "\n");
    }

    /**
     * Print a single ASCII character with no trailing newline (DCD, 0x02).
     * No newline so that a sequence of DCDs forms a string, e.g.
     *   LDA 72  DCD
     *   LDA 105 DCD
     *   LDA 33  DCD
     * prints `Hi!` on one line.
     */
    writeChar(char: string): void {
        process.stdout.write(char);
    }

    /**
     * Print the whole stack on one line, e.g. `[ 1 2 3 ]` (LOG, 0x19).
     * Includes a trailing newline so successive LOGs don't run together.
     */
    writeStack(values: readonly number[]): void {
        process.stdout.write("[ " + values.join(" ") + " ]\n");
    }

    /** Report an error on stderr. */
    writeError(message: string): void {
        process.stderr.write(message + "\n");
    }
}