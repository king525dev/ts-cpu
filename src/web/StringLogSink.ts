import type { LogSink } from "../cpu/logger.js";

/**
 * A LogSink that accumulates everything in memory and exposes it as a
 * single string. Used by the web API when the caller asks for the debug
 * log, and by tests.
 */
export class StringLogSink implements LogSink {
    private readonly lines: string[] = [];
    private closed = false;

    write(line: string): void {
        if (this.closed) return;
        this.lines.push(line);
    }

    close(): void {
        this.closed = true;
    }

    toString(): string {
        return this.lines.join("\n");
    }

    clear(): void {
        this.lines.length = 0;
    }
}