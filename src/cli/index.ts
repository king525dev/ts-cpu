#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import Assembler from "../cpu/assembler.js";
import CPU from "../cpu/cpu.js";
import { nullDisplay } from "../cpu/io.js";
import NodeOutput from "./NodeOutput.js";
import TerminalDisplay from "./TerminalDisplay.js";
import Logger, { type LogSink } from "../cpu/logger.js";
import { FileLogSink } from "./FileLogSink.js";

// ---------------------------------------------------------------------
// Exit codes
// ---------------------------------------------------------------------
//
// These are stable, documented values so the CLI is scriptable:
//
//   oxntal foo.oxn && echo ok      only prints "ok" on success
//
const EXIT_OK = 0;
const EXIT_USAGE = 1;
const EXIT_FILE = 2;
const EXIT_ASSEMBLY = 3;
const EXIT_RUNTIME = 4;

const USAGE = `oxntal — a tiny stack-based CPU

Usage:
    oxntal <program.oxn>              Assemble and run a program
    oxntal run <program.oxn>          Same, with an explicit "run" verb
    oxntal --help                     Show this message

Options:
    --no-display            Suppress graphical (SHW / PRT) output
    --log <path>            Write the debug log to <path>. Default: mycpu.log
                            Use '--log -' to write to stderr instead.
    --trace                 Alias for '--log -'
    --no-log                Disable the debug log entirely
    --verbose               Step through execution, printing pc, opcode, and
                            stack to stderr after each instruction
    -h, --help              Show this message

Exit codes:
    0  success
    1  bad usage
    2  file could not be read
    3  assembly error
    4  runtime error

Examples:
    oxntal examples/hello.oxn
    oxntal run examples/countdown.oxn --trace
    oxntal examples/countdown.oxn --log debug.log
`;

// ---------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------

type LogTarget =
    | { kind: "file"; path: string }
    | { kind: "stderr" }
    | { kind: "none" };

interface Options {
    file: string;
    display: boolean;
    logTarget: LogTarget;
    verbose: boolean;
}

type ParseResult =
    | { kind: "ok"; opts: Options }
    | { kind: "help" }
    | { kind: "error"; message: string };

function parseCLI(argv: string[]): ParseResult {
    let parsed;
    try {
        parsed = parseArgs({
            args: argv,
            options: {
                "no-display": { type: "boolean", default: false },
                "trace": { type: "boolean", default: false },
                "verbose": { type: "boolean", default: false },
                "help": { type: "boolean", short: "h", default: false },
                "log": { type: "string" },
                "no-log": { type: "boolean", default: false },
            },
            allowPositionals: true,
            strict: true,
        });
    } catch (err) {
        return { kind: "error", message: (err as Error).message };
    }

    const { values, positionals } = parsed;

    if (values.help) return { kind: "help" };

    if (positionals.length === 0) {
        return { kind: "error", message: "no program file specified" };
    }

    // Accept both `oxntal file.oxn` and `oxntal run file.oxn`.
    const file =
        positionals[0] === "run" ? positionals[1] : positionals[0];

    if (file === undefined) {
        return {
            kind: "error",
            message: "'run' requires a file argument",
        };
    }

    // ---- Resolve the log target ----

    const noLog = values["no-log"] === true;
    const trace = values.trace === true;
    const logPath = values.log;

    if (noLog && (trace || logPath !== undefined)) {
        return {
            kind: "error",
            message: "--no-log cannot be combined with --log or --trace",
        };
    }
    if (trace && logPath !== undefined) {
        return {
            kind: "error",
            message: "--trace and --log are mutually exclusive",
        };
    }

    let logTarget: LogTarget;
    if (noLog) {
        logTarget = { kind: "none" };
    } else if (trace || logPath === "-") {
        logTarget = { kind: "stderr" };
    } else if (logPath !== undefined) {
        logTarget = { kind: "file", path: logPath };
    } else {
        logTarget = { kind: "file", path: "oxntal.log" };
    }

    return {
        kind: "ok",
        opts: {
            file,
            display: values["no-display"] !== true,
            logTarget,
            verbose: values.verbose === true,
        },
    };
}

// ---------------------------------------------------------------------
// Logger factory
// ---------------------------------------------------------------------

function makeLogger(target: LogTarget): Logger {
    switch (target.kind) {
        case "none":
            return new Logger();
        case "stderr":
            return new Logger({
                sink: {
                    write(line: string) {
                        process.stderr.write(line + "\n");
                    },
                },
            });
        case "file":
            return new Logger({
                sink: new FileLogSink({ path: target.path }),
            });
    }
}

// ---------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------

function main(): number {
    const result = parseCLI(process.argv.slice(2));

    if (result.kind === "help") {
        process.stdout.write(USAGE);
        return EXIT_OK;
    }

    if (result.kind === "error") {
        process.stderr.write(`Error: ${result.message}\n\n`);
        process.stderr.write(USAGE);
        return EXIT_USAGE;
    }

    const opts = result.opts;
    const output = new NodeOutput();
    const display = opts.display ? new TerminalDisplay() : nullDisplay;

    // ---- Create logger ----
    let logger: Logger;
    try {
        logger = makeLogger(opts.logTarget);
    } catch (err) {
        // Log file could not be opened. Fall back to stderr and tell the user.
        output.writeError((err as Error).message);
        return EXIT_FILE;
    }

    process.on("exit", () => {
        logger.stop();
    });

    logger.start(`OXNTAL CLI @ ${ new Date().toLocaleString()}`);
    if (opts.logTarget.kind === "file") {
        logger.info(`Logging to ${opts.logTarget.path}`);
    }

    try{
        // -----------------------------------------------------------------
        // Read the source file
        // -----------------------------------------------------------------
        let source: string;
        try {
            source = readFileSync(opts.file, "utf8");
        } catch (err) {
            const e = err as NodeJS.ErrnoException;
            if (e.code === "ENOENT") {
                output.writeError(`File not found: ${opts.file}`);
            } else if (e.code === "EISDIR") {
                output.writeError(`Not a file: ${opts.file}`);
            } else {
                output.writeError(`Could not read ${opts.file}: ${e.message}`);
            }
            logger.stop();
            return EXIT_FILE;
        }

        // -----------------------------------------------------------------
        // Assemble
        // -----------------------------------------------------------------
        logger.event("Initialised Assembler");
        const assembler = new Assembler(logger);
        let bytecode: number[];
        try {
            bytecode = assembler.assemble(source);
        } catch (err) {
            logger.error((err as Error).message, err);
            logger.stop();
            output.writeError(`Assembly error: ${(err as Error).message}`);
            return EXIT_ASSEMBLY;
        }
        logger.bytecode(bytecode);

        // -----------------------------------------------------------------
        // Run
        // -----------------------------------------------------------------
        logger.event("CPU initialised");
        const cpu = new CPU(output, display, logger);
        cpu.load(bytecode);
        logger.event("Execution started");

        try {
            if (opts.verbose) {
                runVerbose(cpu);
            } else {
                cpu.run();
            }
        } catch (err) {
            logger.stop();
            output.writeError(`Runtime error: ${(err as Error).message}`);
            return EXIT_RUNTIME;
        }

        return EXIT_OK;
    } finally {
        logger.stop();
    }
}

// ---------------------------------------------------------------------
// --verbose: hand-formatted per-step trace
// ---------------------------------------------------------------------
//
// Prints one line per instruction to stderr. Distinct from --trace:
// --verbose uses this fixed layout below; --trace routes the full Logger
// to stderr and includes assembler events, RAM accesses, jump events, etc.
//
// Example output:
//
//   [pc=0004 sp=  2 op=0x1d] stack=[10 33]
//
function runVerbose(cpu: CPU): void {
    cpu.running = true;
    while (cpu.running) {
        const pc = cpu.pc;
        const op = cpu.program[pc] ?? 0;
        const sp = cpu.stack.getStackPointer();
        const stack = snapshotStack(cpu);

        process.stderr.write(
            `[pc=${hex4(pc)} sp=${sp.toString().padStart(3)} ` +
            `op=0x${op.toString(16).padStart(2, "0")}] ` +
            `stack=[${stack.join(" ")}]\n`,
        );

        cpu.step();
    }
}

function snapshotStack(cpu: CPU): number[] {
    const data = cpu.stack.getStackData();
    const sp = cpu.stack.getStackPointer();
    const result: number[] = new Array(sp);
    for (let i = 0; i < sp; i++) result[i] = data[i] ?? 0;
    return result;
}

function hex4(n: number): string {
    return n.toString(16).padStart(4, "0");
}

// Use process.exitCode rather than process.exit() so that any buffered
// stdout writes are flushed before the process actually terminates.
process.exitCode = main();