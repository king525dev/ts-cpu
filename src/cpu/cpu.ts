// --------------------------------------------------------- //
// CPU.ts
// --------------------------------------------------------- //

import ALU from "./alu.js";
import Stack from "./stack.js";
import RAM from "./ram.js";
import type { CPUOutput, CPUDisplay } from "./io.js";
import { nullOutput, nullDisplay } from "./io.js";

/**
 * A stack-based CPU.
 *
 * The CPU is a pure logic engine: it takes a bytecode program, executes it
 * one opcode at a time, and reports results through two injected adapters
 * (`CPUOutput` and `CPUDisplay`). 
 * 
 *   const cpu = new CPU(new NodeOutput(), new TerminalDisplay());
 *   cpu.load(bytecode);
 *   cpu.run();
 *
 */
export default class CPU {
    stack: Stack;
    alu: ALU;
    ram: RAM;
    program: Uint8Array;
    pc: number;
    running: boolean;

    private output: CPUOutput;
    private display: CPUDisplay;

    constructor(
        output: CPUOutput = nullOutput,
        display: CPUDisplay = nullDisplay,
    ) {
        this.stack = new Stack();
        this.alu = new ALU();
        this.ram = new RAM();
        this.program = new Uint8Array(0);
        this.pc = 0;
        this.running = false;
        this.output = output;
        this.display = display;
    }

    /**
     * Replace the I/O adapters after construction. Useful when a UI
     * creates the CPU early but only wires up its output panel later, or
     * when a test wants to swap in a capturing adapter mid-run.
     */
    setIO(output: CPUOutput, display: CPUDisplay): void {
        this.output = output;
        this.display = display;
    }

    /** Load a program and reset the program counter. */
    load(bytecode: number[]): void {
        this.program = new Uint8Array(bytecode);
        this.pc = 0;
    }

    /**
     * Execute a single instruction. Returns `true` while the CPU should
     * keep running, `false` once `BRK` has been reached or before `run()`
     * has been called.
     */
    step(): boolean {
        if (!this.running) return false;
        const opcode = this.program[this.pc++];

        switch (opcode) {
            // -----------------------------------------------------------
            // Stack / literal loading
            // -----------------------------------------------------------
            case 0x01: { // LDA
                const value = this.program[this.pc++];
                if (value === undefined) {
                    throw new Error("LDA instruction needs accompanying parameter");
                }
                this.stack.push(value);
                break;
            }
            case 0x02: { // DCD
                this.output.writeChar(String.fromCharCode(this.stack.pop()));
                break;
            }
            case 0x03: { // POP
                this.stack.pop();
                break;
            }
            case 0x04: { // NIP
                this.stack.nip();
                break;
            }
            case 0x05: { // SWP
                this.stack.swap();
                break;
            }
            case 0x06: { // DUP
                this.stack.dup();
                break;
            }
            case 0x07: { // OVR
                this.stack.ovr();
                break;
            }
            case 0x08: { // ROT
                this.stack.rot();
                break;
            }
            case 0x09: { // CLR
                this.stack.clr();
                break;
            }

            // -----------------------------------------------------------
            // Binary arithmetic / logic
            // -----------------------------------------------------------
            case 0x0A: { // ADD
                const a = this.stack.pop();
                const b = this.stack.pop();
                this.stack.push(this.alu.exec("ADD", b, a));
                break;
            }
            case 0x0B: { // SUB
                const a = this.stack.pop();
                const b = this.stack.pop();
                this.stack.push(this.alu.exec("SUB", b, a));
                break;
            }
            case 0x0C: { // MUL
                const a = this.stack.pop();
                const b = this.stack.pop();
                this.stack.push(this.alu.exec("MUL", b, a));
                break;
            }
            case 0x0D: { // DIV
                const a = this.stack.pop();
                const b = this.stack.pop();
                this.stack.push(this.alu.exec("DIV", b, a));
                break;
            }
            case 0x0E: { // MOD
                const a = this.stack.pop();
                const b = this.stack.pop();
                this.stack.push(this.alu.exec("MOD", b, a));
                break;
            }
            case 0x0F: { // AND
                const a = this.stack.pop();
                const b = this.stack.pop();
                this.stack.push(this.alu.exec("AND", b, a));
                break;
            }
            case 0x10: { // ORA
                const a = this.stack.pop();
                const b = this.stack.pop();
                this.stack.push(this.alu.exec("ORA", b, a));
                break;
            }
            case 0x11: { // EOR
                const a = this.stack.pop();
                const b = this.stack.pop();
                this.stack.push(this.alu.exec("EOR", b, a));
                break;
            }

            // -----------------------------------------------------------
            // Unary arithmetic / logic
            // -----------------------------------------------------------
            case 0x12: { // NOT
                const b = this.stack.pop();
                this.stack.push(this.alu.exec("NOT", b, 0));
                break;
            }
            case 0x13: { // INC
                const b = this.stack.pop();
                this.stack.push(this.alu.exec("INC", b, 0));
                break;
            }
            case 0x14: { // DEC
                const b = this.stack.pop();
                this.stack.push(this.alu.exec("DEC", b, 0));
                break;
            }
            case 0x17: { // NEG
                const b = this.stack.pop();
                this.stack.push(this.alu.exec("NEG", b, 0));
                break;
            }

            // -----------------------------------------------------------
            // Binary shifts
            // -----------------------------------------------------------
            case 0x15: { // SHL
                const a = this.stack.pop();
                const b = this.stack.pop();
                this.stack.push(this.alu.exec("SHL", b, a));
                break;
            }
            case 0x16: { // SHR
                const a = this.stack.pop();
                const b = this.stack.pop();
                this.stack.push(this.alu.exec("SHR", b, a));
                break;
            }

            // -----------------------------------------------------------
            // Text output
            // -----------------------------------------------------------
            case 0x18: { // OUT
                this.output.writeNumber(this.stack.pop());
                break;
            }
            case 0x19: { // LOG
                this.output.writeStack(this.stackSnapshot());
                break;
            }

            // -----------------------------------------------------------
            // Graphical output
            // -----------------------------------------------------------
            case 0x1A: { // PRT
                this.display.printStack(this.stackSnapshot());
                break;
            }
            case 0x1B: { // SHW
                this.display.showTop(this.stack.peek());
                break;
            }

            // -----------------------------------------------------------
            // Memory
            // -----------------------------------------------------------
            case 0x1C: { // STA
                const addr = this.program[this.pc++];
                if (addr === undefined) {
                    throw new Error(
                        "STA instruction needs accompanying address parameter, " +
                        "use 0x00 if unsure",
                    );
                }
                const value = this.stack.pop();
                if (addr === 0) {
                    this.ram.addDataAtFreeAddress(value);
                } else {
                    this.ram.writeDataAt(addr, value);
                }
                break;
            }
            case 0x1D: { // LDR
                const addr = this.program[this.pc++];
                if (addr === undefined) {
                    throw new Error(
                        "LDR instruction needs accompanying address parameter, " +
                        "use 0x00 if unsure",
                    );
                }
                if (addr === 0) {
                    this.stack.push(this.ram.getLastLoadedValue());
                } else {
                    this.stack.push(this.ram.getDataAt(addr));
                }
                break;
            }

            // -----------------------------------------------------------
            // Control flow
            // -----------------------------------------------------------
            case 0x1E: { // JMP
                const addr = this.program[this.pc++];
                if (addr === undefined) {
                    throw new Error(
                        "JMP instruction needs accompanying address parameter",
                    );
                }
                if (addr >= this.program.length) {
                    throw new Error(
                        `Invalid instruction address: 0x${addr.toString(16)}`,
                    );
                }
                this.pc = addr;
                break;
            }
            case 0x1F: { // JCN
                const addr = this.program[this.pc++];
                const condition = this.stack.pop();
                if (addr === undefined) {
                    throw new Error(
                        "JCN instruction needs accompanying address parameter",
                    );
                }
                if (addr >= this.program.length) {
                    throw new Error(
                        `Invalid instruction address: 0x${addr.toString(16)}`,
                    );
                }
                if (condition > 0) {
                    this.pc = addr;
                }
                break;
            }

            // -----------------------------------------------------------
            // Character literal loading
            // -----------------------------------------------------------
            case 0x20: { // ECD
                const value = this.program[this.pc++];
                if (value === undefined) {
                    throw new Error(
                        "ECD instruction needs accompanying parameter",
                    );
                }
                this.stack.push(value);
                break;
            }

            // -----------------------------------------------------------
            // Comparisons
            // -----------------------------------------------------------
            case 0x21: { // EQU
                const a = this.stack.pop();
                const b = this.stack.pop();
                this.stack.push(this.alu.exec("EQU", b, a));
                break;
            }
            case 0x22: { // GTH
                const a = this.stack.pop();
                const b = this.stack.pop();
                this.stack.push(this.alu.exec("GTH", b, a));
                break;
            }
            case 0x23: { // LTH
                const a = this.stack.pop();
                const b = this.stack.pop();
                this.stack.push(this.alu.exec("LTH", b, a));
                break;
            }

            // -----------------------------------------------------------
            // Halt
            // -----------------------------------------------------------
            case 0xFF: { // BRK
                this.running = false;
                break;
            }

            default: {
                throw new Error(
                    `Unknown opcode: 0x${(opcode ?? 0).toString(16)}`,
                );
            }
        }

        return this.running;
    }

    /** Run until `BRK` or an error. */
    run(): void {
        this.running = true;
        while (this.running) this.step();
    }

    // -----------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------

    /**
     * Copy the live stack into a plain `number[]` so that display/output
     * adapters cannot accidentally mutate the CPU's internal state by
     * holding a reference to the underlying `Uint8Array`.
     */
    private stackSnapshot(): number[] {
        const data = this.stack.getStackData();
        const sp = this.stack.getStackPointer();
        const snapshot: number[] = new Array(sp);
        for (let i = 0; i < sp; i++) {
            snapshot[i] = data[i] ?? 0;
        }
        return snapshot;
    }
}