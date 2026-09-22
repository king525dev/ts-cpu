import Assembler from "../cpu/assembler.js";
import CPU from "../cpu/cpu.js";
import Logger from "../cpu/logger.js";
import { nullDisplay } from "../cpu/io.js";
import type { CPUOutput, CPUDisplay } from "../cpu/io.js";
import { BufferOutput } from "./BufferOutput.js";
import { CanvasDisplay } from "./CanvasDisplay.js";
import { StringLogSink } from "./StringLogSink.js";

// ---------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------

export interface AssembleOptions {
    captureLog?: boolean | undefined;
}

export interface AssembleResult {
    ok: boolean;
    bytecode: number[] | undefined;
    log: string | undefined;
    error: string | undefined;
}

export interface ExecuteOptions {
    canvas?: HTMLCanvasElement | undefined;
    captureLog?: boolean | undefined;
}

export interface ExecuteResult {
    ok: boolean;
    stdout: string;
    stderr: string;
    numbers: number[];
    chars: string[];
    finalStack: number[];
    log: string | undefined;
    error: ExecuteError | undefined;
}

export interface ExecuteError {
    kind: "runtime";
    message: string;
}

export interface RunOptions {
    source: string;
    canvas?: HTMLCanvasElement | undefined;
    captureLog?: boolean | undefined;
}

export interface RunResult {
    ok: boolean;
    stdout: string;
    stderr: string;
    numbers: number[];
    chars: string[];
    finalStack: number[];
    bytecode: number[] | undefined;
    log: string | undefined;
    error: RunError | undefined;
}

export interface RunError {
    kind: "assembly" | "runtime";
    message: string;
}

// ---------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------

/**
 * Assemble source text into bytecode.
 *
 * Never throws. Errors are reported through the `ok` / `error` fields.
 */
export function assemble(
    source: string,
    options: AssembleOptions = {},
): AssembleResult {
    const logSink = options.captureLog ? new StringLogSink() : null;
    const logger = logSink ? new Logger({ sink: logSink }) : new Logger();

    if (logSink) logger.start(`OXNTAL WEB @ ${ new Date().toLocaleString('en-GB')}`);

    try {
        const bytecode = new Assembler(logger).assemble(source);
        if (logSink) logger.bytecode(bytecode);
        if (logSink) logger.stop();
        return {
            ok: true,
            bytecode,
            log: logSink?.toString(),
            error: undefined,
        };
    } catch (err) {
        if (logSink) {
            logger.error((err as Error).message, err);
            logger.stop();
        }
        return {
            ok: false,
            bytecode: undefined,
            log: logSink?.toString(),
            error: (err as Error).message,
        };
    }
}

/**
 * Execute already-assembled bytecode.
 *
 * Never throws. Errors are reported through the `ok` / `error` fields.
 */
export function execute(
    bytecode: readonly number[],
    options: ExecuteOptions = {},
): ExecuteResult {
    const logSink = options.captureLog ? new StringLogSink() : null;
    const logger = logSink ? new Logger({ sink: logSink }) : new Logger();
    const output = new BufferOutput();
    const display: CPUDisplay = options.canvas
        ? new CanvasDisplay(options.canvas)
        : nullDisplay;

    if (logSink) logger.start(`OXNTAL WEB @ ${ new Date().toLocaleString('en-GB')}`);

    logger.event("CPU initialised");
    const cpu = new CPU(output, display, logger);
    cpu.load([...bytecode]);
    logger.event("Execution started");

    try {
        cpu.run();
        if (logSink) logger.stop();
        return {
            ok: true,
            stdout: output.getStdout(),
            stderr: output.getStderr(),
            numbers: output.getNumbers(),
            chars: output.getChars(),
            finalStack: snapshotStack(cpu),
            log: logSink?.toString(),
            error: undefined,
        };
    } catch (err) {
        // The CPU's step() already logged this with pc/opcode context.
        if (logSink) logger.stop();
        return {
            ok: false,
            stdout: output.getStdout(),
            stderr: output.getStderr(),
            numbers: output.getNumbers(),
            chars: output.getChars(),
            finalStack: snapshotStack(cpu),
            log: logSink?.toString(),
            error: {
                kind: "runtime",
                message: (err as Error).message,
            },
        };
    }
}

/**
 * Assemble then execute in a single call.
 */
export function run(options: RunOptions): RunResult {
    const asm = assemble(options.source, {
        captureLog: options.captureLog,
    });

    if (!asm.ok || !asm.bytecode) {
        return {
            ok: false,
            stdout: "",
            stderr: "",
            numbers: [],
            chars: [],
            finalStack: [],
            bytecode: undefined,
            log: asm.log,
            error: {
                kind: "assembly",
                message: asm.error ?? "Unknown assembly error",
            },
        };
    }

    const exec = execute(asm.bytecode, {
        canvas: options.canvas,
        captureLog: options.captureLog,
    });

    return {
        ok: exec.ok,
        stdout: exec.stdout,
        stderr: exec.stderr,
        numbers: exec.numbers,
        chars: exec.chars,
        finalStack: exec.finalStack,
        bytecode: asm.bytecode,
        log: exec.log,
        error: exec.error,
    };
}

// ---------------------------------------------------------------------
// Advanced exports
// ---------------------------------------------------------------------
//
// The facade above is the recommended entry point. Everything below is
// re-exported for callers who want finer control.

export { CPU, Assembler, Logger };
export { BufferOutput, CanvasDisplay, StringLogSink };
export type { CPUOutput, CPUDisplay } from "../cpu/io.js";
export type { LogSink } from "../cpu/logger.js";

// ---------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------

function snapshotStack(cpu: CPU): number[] {
    const data = cpu.stack.getStackData();
    const sp = cpu.stack.getStackPointer();
    const snapshot: number[] = new Array(sp);
    for (let i = 0; i < sp; i++) snapshot[i] = data[i] ?? 0;
    return snapshot;
}