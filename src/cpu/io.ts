// --------------------------------------------------------- //
// IO.ts
// --------------------------------------------------------- //

/**
 * Platform-independent I/O contracts for the CPU.
 *
 * The two interfaces are kept separate on purpose:
 *
 *   * CPUOutput  – textual/numeric output (numbers, chars, stack dumps,
 *                  error messages). Always available. Backed by `stdout`
 *                  in Node, a `<pre>` in the browser, a string buffer in
 *                  tests.
 *
 *   * CPUDisplay – graphical output (a visualisation of the stack or of the
 *                  top-of-stack value). Optional. Backed by a `<canvas>` in
 *                  the browser and Electron, by ASCII art in the terminal,
 *                  or by nothing at all in headless tests.
 *
 */

export interface CPUOutput {
    /** Print a number followed by a newline (OUT, 0x18). */
    writeNumber(value: number): void;

    /** Print a single ASCII character with no trailing newline (DCD, 0x02). */
    writeChar(char: string): void;

    /**
     * Print the full stack, top-ordered as the user sees it (LOG, 0x19).
     * The array is a snapshot; the adapter must not mutate it.
     */
    writeStack(values: readonly number[]): void;

    /** Report a non-fatal error. Typically goes to stderr. */
    writeError(message: string): void;
}

export interface CPUDisplay {
    /** Show a visualisation of the current top-of-stack value (SHW, 0x1B). */
    showTop(value: number): void;

    /** Show a visualisation of the full stack (PRT, 0x1A). */
    printStack(values: readonly number[]): void;
}

/**
 * No-op output. Useful as a default constructor argument and as the base
 * for tests that only care about a subset of the methods.
 */
export const nullOutput: CPUOutput = {
    writeNumber() {},
    writeChar() {},
    writeStack() {},
    writeError() {},
};

/**
 * No-op display. Headless environments (CI, unit tests, a pure CLI build
 * that doesn't want to print ASCII art) can use this without any DOM.
 */
export const nullDisplay: CPUDisplay = {
    showTop() {},
    printStack() {},
};