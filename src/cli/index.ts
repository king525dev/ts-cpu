#!/usr/bin/env node
// src/cli/index.ts

import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import Assembler from "../cpu/assembler.js";
import CPU from "../cpu/cpu.js";
import { nullDisplay } from "../cpu/io.js";
import NodeOutput from "./NodeOutput.js";
import TerminalDisplay from "./TerminalDisplay.js";

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
    --no-display    Suppress graphical (SHW / PRT) output
    --trace         Print pc, opcode, and stack-pointer for each instruction
    -h, --help      Show this message

Exit codes:
    0  success
    1  bad usage
    2  file could not be read
    3  assembly error
    4  runtime error

Examples:
    oxntal examples/hello.oxn
    oxntal run examples/countdown.oxn --trace
`;

// ---------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------

interface Options {
    file: string;
    trace: boolean;
    display: boolean;
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
                "help": { type: "boolean", short: "h", default: false },
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

    return {
        kind: "ok",
        opts: {
            file,
            trace: values.trace === true,
            display: values["no-display"] !== true,
        },
    };
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
        return EXIT_FILE;
    }

    // -----------------------------------------------------------------
    // Assemble
    // -----------------------------------------------------------------
    let bytecode: number[];
    try {
        bytecode = new Assembler().assemble(source);
    } catch (err) {
        output.writeError(`Assembly error: ${(err as Error).message}`);
        return EXIT_ASSEMBLY;
    }

    // -----------------------------------------------------------------
    // Run
    // -----------------------------------------------------------------
    const cpu = new CPU(output, display);
    cpu.load(bytecode);

    try {
        if (opts.trace) {
            runWithTrace(cpu);
        } else {
            cpu.run();
        }
    } catch (err) {
        output.writeError(`Runtime error: ${(err as Error).message}`);
        return EXIT_RUNTIME;
    }

    return EXIT_OK;
}

// ---------------------------------------------------------------------
// Trace mode
// ---------------------------------------------------------------------
//
// Prints one line per instruction to stderr:
//
//   [pc=0004 sp=  2 op=0x1d] stack=[10 33]
//
// stderr (not stdout) so that `oxntal foo.oxn --trace > out.txt` still
// captures only the program's own output on stdout.
//
function runWithTrace(cpu: CPU): void {
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