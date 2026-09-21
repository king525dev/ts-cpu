import type { CPUOutput } from "../cpu/io.js";

/**
 * A CPUOutput that records everything the program prints. Useful when the
 * caller wants to render output themselves (in a <pre>, an alert, or a
 * terminal emulator component).
 *
 * `stdout` is what a terminal user would see: numbers one per line,
 * characters concatenated, and stack dumps in bracket form.
 */
export class BufferOutput implements CPUOutput {
    private stdout = "";
    private stderr = "";
    private readonly numbers: number[] = [];
    private readonly chars: string[] = [];
    private readonly stacks: number[][] = [];

    writeNumber(value: number): void {
        this.numbers.push(value);
        this.stdout += value + "\n";
    }

    writeChar(char: string): void {
        this.chars.push(char);
        this.stdout += char;
    }

    writeStack(values: readonly number[]): void {
        this.stacks.push([...values]);
        this.stdout += "[ " + values.join(" ") + " ]\n";
    }

    writeError(message: string): void {
        this.stderr += message + "\n";
    }

    getStdout(): string { return this.stdout; }
    getStderr(): string { return this.stderr; }
    getNumbers(): number[] { return [...this.numbers]; }
    getChars(): string[] { return [...this.chars]; }
    getStacks(): number[][] { return this.stacks.map((a) => [...a]); }
}