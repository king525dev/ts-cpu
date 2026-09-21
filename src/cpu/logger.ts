// --------------------------------------------------------- //
// LOGGER.ts
// --------------------------------------------------------- //

/**
 * Debug logging for the CPU pipeline.
 *
 * Two layers, deliberately separated:
 *
 *   Logger  — owns the *format* of a line (timestamp, elapsed suffix,
 *             hex casing, error layout). Every platform sees the same
 *             shape of output.
 *
 *   LogSink — owns the *destination*. CLI writes to a file, the desktop
 *             and web UIs write to a page, tests write to a string buffer.
 *
 * The CPU never depends on the sink, only on the Logger. Passing a
 * Logger with no sink is equivalent to disabling logging entirely.
 */

export interface LogSink {
    /** Write a single already-formatted line. Implementations add their own newline. */
    write(line: string): void;
    /** Optional: called once when the logger is stopped. */
    close?(): void;
}

/** A sink that discards everything. Used as the default. */
export const nullSink: LogSink = {
    write() {},
};

export interface LoggerOptions {
    sink?: LogSink;
    /** Override the timestamp format. Defaults to "DD.MM.YY-HH:MM". */
    timestampFormat?: (d: Date) => string;
}

export default class Logger {
    private readonly sink: LogSink;
    private readonly format: (d: Date) => string;
    private startTime: number;
    private closed: boolean;

    constructor(options: LoggerOptions = {}) {
        this.sink = options.sink ?? nullSink;
        this.format = options.timestampFormat ?? defaultTimestamp;
        this.startTime = nowMs();
        this.closed = false;
    }

    // -----------------------------------------------------------------
    // Session lifecycle
    // -----------------------------------------------------------------

    /** Begin a session. Prints a banner and resets the elapsed clock. */
    start(title = `OXNTAL @ ${ new Date().toLocaleString()}`): void {
        this.startTime = nowMs();
        this.closed = false;
        this.raw(`// --> ${title} <-- //`);
        this.raw("");
    }

    /** End the session and close the sink. Safe to call more than once. */
    stop(): void {
        if (this.closed) return;
        this.line("Process Exited");
        this.closed = true;
        this.sink.close?.();
    }

    // -----------------------------------------------------------------
    // Structured events
    // -----------------------------------------------------------------

    /** General information line. */
    info(message: string): void {
        this.line(message);
    }

    /** Section marker: "Initialised Assembler", "CPU initialised", etc. */
    event(message: string): void {
        this.line(message);
    }

    /** Warning: something unexpected but not fatal. */
    warn(message: string): void {
        this.line(`WARN ${message}`);
    }

    /**
     * Error with optional cause. The stack trace is truncated to three
     * frames so the log stays readable — the top of the stack is usually
     * where the real problem is, and the bottom is framework noise.
     */
    error(message: string, cause?: unknown): void {
        let headline = `ERR! ${message}`;
        if (
            cause instanceof Error &&
            cause.message &&
            !message.includes(cause.message)
        ) {
            headline += `: ${cause.message}`;
        }
        this.line(headline);

        if (cause instanceof Error && cause.stack) {
            const frames = cause.stack.split("\n").slice(1, 4);
            for (const frame of frames) {
                this.line(`     ${frame.trim()}`);
            }
        }
    }

    // -----------------------------------------------------------------
    // Domain-specific formatters
    // -----------------------------------------------------------------

    /** Dump a program as uppercase hex, e.g. "00 12 58 95". */
    bytecode(bytes: readonly number[]): void {
        const hex = bytes.map(toHexByte).join(" ");
        this.line(`Assembler process finished with values:`);
        this.line(` [ ${hex} ]`);
    }

    /**
     * One CPU step. Shows the program counter *before* the instruction,
     * the opcode, the stack pointer, and the whole stack as hex.
     *
     *   [pc=0x0004 op=0x1d sp=2] Stack: [ 0a 21 ]
     */
    step(pc: number, opcode: number, stack: readonly number[]): void {
        const stackHex = stack.map(toHexByte).join(" ");
        this.line(
            `[pc=0x${toHexWord(pc)} op=0x${toHexByte(opcode)} ` +
            `sp=${stack.length}] Stack: [ ${stackHex} ]`,
        );
    }

    /**
     * Control-flow transition.
     *
     *   Flow: JMP 0x0004 -> 0x0010 (taken)
     *   Flow: JCN 0x0006 -> 0x0002 (not taken)
     */
    jump(
        from: number,
        to: number,
        taken: boolean,
        conditional: boolean,
    ): void {
        const kind = conditional ? "JCN" : "JMP";
        const outcome = taken ? "taken" : "not taken";
        this.line(
            `Flow: ${kind} 0x${toHexWord(from)} -> 0x${toHexWord(to)} (${outcome})`,
        );
    }

    /**
     * RAM read or write.
     *
     *   RAM wrote 42 @ 10
     *   RAM read  00 @ 10
     */
    memory(addr: number, value: number, isWrite: boolean): void {
        this.line(
            `RAM ${isWrite ? "wrote" : "read "} ` +
            `${toHexByte(value)} @ ${toHexByte(addr)}`,
        );
    }

    // -----------------------------------------------------------------
    // Assembler events
    // -----------------------------------------------------------------

    /** Log a named list of tokens, e.g. "After comment stripping: [ LDA 5 ]". */
    tokens(label: string, tokens: readonly string[]): void {
        this.line(`${label}: [ ${tokens.join(" ")} ]`);
    }

    /** A `VAR` or `@name` declaration was given a RAM address. */
    varAllocated(name: string, address: number): void {
        this.line(`Assigned '${name}' to RAM address 0x${toHexByte(address)}`);
    }

    /** A `>label` declaration was assigned a bytecode address. */
    labelDeclared(name: string, bytecodeAddress: number): void {
        this.line(`Label '${name}' at bytecode 0x${toHexWord(bytecodeAddress)}`);
    }

    /** A variable name was resolved to an address in the emit pass. */
    varReferenced(name: string, address: number): void {
        this.line(`  Referenced var '${name}' (0x${toHexByte(address)})`);
    }

    /** A label name was resolved to a bytecode address in the emit pass. */
    labelReferenced(name: string, bytecodeAddress: number): void {
        this.line(
            `  Referenced label '${name}' (0x${toHexWord(bytecodeAddress)})`,
        );
    }

    /**
     * Dump the symbol table after the scan pass. Variables and labels are
     * printed in declaration order. Skipped entirely when both are empty, so
     * trivial programs don't get a noisy header with nothing under it.
     */
    symbolTable(
        labels: ReadonlyMap<string, number>,
        vars: ReadonlyMap<string, number>,
    ): void {
        if (labels.size === 0 && vars.size === 0) return;
        this.line("Symbol table:");
        for (const [name, addr] of vars) {
            this.line(`  var   ${name} -> 0x${toHexByte(addr)}`);
        }
        for (const [name, addr] of labels) {
            this.line(`  label ${name} -> 0x${toHexWord(addr)}`);
        }
    }

    // -----------------------------------------------------------------
    // Internals
    // -----------------------------------------------------------------

    private line(message: string): void {
        // Fast path: a null sink costs nothing, so per-step logging does
        // not slow down tight loops when logging is disabled.
        if (this.sink === nullSink) return;

        const now = new Date();
        const stamp = this.format(now);
        const elapsed = Math.round(nowMs() - this.startTime);
        this.raw(`[${stamp}] ${message} {${elapsed}ms}`);
    }

    private raw(message: string): void {
        this.sink.write(message);
    }
}

// ---------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------

function defaultTimestamp(d: Date): string {
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yy = String(d.getFullYear()).slice(-2);
    const hh = String(d.getHours()).padStart(2, "0");
    const mn = String(d.getMinutes()).padStart(2, "0");
    return `${dd}.${mm}.${yy}-${hh}:${mn}`;
}

function toHexByte(n: number): string {
    return n.toString(16).padStart(2, "0");
}

function toHexWord(n: number): string {
    return n.toString(16).padStart(4, "0");
}

const nowMs = (): number =>
    typeof performance !== "undefined" && typeof performance.now === "function"
        ? performance.now()
        : Date.now();

/**
 * A Logger that does nothing. Used as the default third argument to the
 * CPU constructor, so existing call sites keep working unchanged.
 */
export const nullLogger: Logger = new Logger();