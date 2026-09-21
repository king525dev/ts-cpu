// src/web/api.ts

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
    /** If true, the debug log is captured and returned in the result. */
    captureLog?: boolean;
}

export interface AssembleResult {
    ok: boolean;
    bytecode?: number[];
    log?: string;
    error?: string;
}

export interface ExecuteOptions {
    /** If provided, SHW and PRT draw into this canvas. */
    canvas?: HTMLCanvasElement;
    /** If true, the debug log is captured and returned in the result. */
    captureLog?: boolean;
}

export interface ExecuteResult {
    ok: boolean;
    stdout: string;
    stderr: string;
    numbers: number[];
    chars: string[];
    /** The final contents of the stack, bottom-first. */
    finalStack: number[];
    log?: string;
    /** Only present when ok === false. */
    error?: {
        kind: "runtime";
        message: string;
    };
}

export interface RunOptions {
    source: string;
    canvas?: HTMLCanvasElement;
    captureLog?: boolean;
}

export interface RunResult {
    ok: boolean;
    stdout: string;
    stderr: string;
    numbers: number[];
    chars: string[];
    finalStack: number[];
    bytecode?: number[];
    log?: string;
    error?: {
        kind: "assembly" | "runtime";
        message: string;
    };
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

    try {
        const bytecode = new Assembler(logger).assemble(source);
        return {
            ok: true,
            bytecode,
            log: logSink?.toString(),
        };
    } catch (err) {
        return {
            ok: false,
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

    const cpu = new CPU(output, display, logger);
    cpu.load([...bytecode]);

    try {
        cpu.run();
    } catch (err) {
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

    return {
        ok: true,
        stdout: output.getStdout(),
        stderr: output.getStderr(),
        numbers: output.getNumbers(),
        chars: output.getChars(),
        finalStack: snapshotStack(cpu),
        log: logSink?.toString(),
    };
}

/**
 * The one-shot entry point: assemble then execute in a single call.
 *
 * This is what most consumers want.
 */
export function run(options: RunOptions): RunResult {
    const asm = assemble(options.source, { captureLog: options.captureLog });

    if (!asm.ok || !asm.bytecode) {
        return {
            ok: false,
            stdout: "",
            stderr: "",
            numbers: [],
            chars: [],
            finalStack: [],
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

export { default as CPU } from "../cpu/cpu.js";
export { default as Assembler } from "../cpu/assembler.js";
export { default as Logger } from "../cpu/logger.js";
export { default as Stack } from "../cpu/stack.js";
export { default as RAM } from "../cpu/ram.js";
export type { CPUOutput, CPUDisplay } from "../cpu/io.js";
export type { LogSink } from "../cpu/logger.js";
export { BufferOutput } from "./BufferOutput.js";
export { CanvasDisplay } from "./CanvasDisplay.js";
export { StringLogSink } from "./StringLogSink.js";

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