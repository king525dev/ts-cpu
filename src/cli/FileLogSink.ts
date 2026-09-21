import { appendFileSync, writeFileSync } from "node:fs";
import type { LogSink } from "../cpu/logger.js";

export interface FileLogSinkOptions {
    /**
     * Path to the log file. Created if it does not exist. Its parent
     * directory must already exist — the sink raises a clear error at
     * construction otherwise, so the user finds out immediately rather
     * than on the first log line.
     */
    path: string;
    /**
     * If true, the file is truncated at construction.
     * Default: false — successive runs append, separated by each run's
     * `// --> OXNTAL <-- //` banner.
     */
    truncate?: boolean;
}

/**
 * Writes log lines to a file on disk.
 *
 * Uses the synchronous fs API because the CLI is a short-lived process:
 * a few thousand appends at most, and doing them sync means we never have
 * to worry about losing the tail of the log when the process exits.
 *
 * The sink is stateless apart from a `closed` flag — every write is an
 * `appendFileSync` on the raw path, so an external `tail -f` sees each
 * line the moment it lands.
 */
export class FileLogSink implements LogSink {
    private readonly path: string;
    private closed = false;

    constructor(options: FileLogSinkOptions) {
        this.path = options.path;
        try {
            if (options.truncate) {
                writeFileSync(this.path, "", "utf8");
            } else {
                // Creates the file if missing, no-ops if it exists.
                appendFileSync(this.path, "", "utf8");
            }
        } catch (err) {
            throw new Error(
                `Could not open log file '${this.path}': ` +
                `${(err as Error).message}`,
            );
        }
    }

    write(line: string): void {
        if (this.closed) return;
        appendFileSync(this.path, line + "\n", "utf8");
    }

    close(): void {
        this.closed = true;
    }
}