import ALU from "./alu.js";
import Stack from './stack.js';
import Display from './display.js';
import RAM from "./ram.js";

export default class CPU {
    stack: Stack;
    alu: ALU;
    // display: Display;
    program: Uint8Array;
    ram: RAM;
    pc: number;
    running: boolean;

    constructor() {
        this.stack = new Stack();
        this.alu = new ALU();
        this.program = new Uint8Array(0);
        // this.display = new Display(new HTMLCanvasElement)
        this.ram = new RAM();
        this.pc = 0;
        this.running = false;
    }

    load(bytecode: number[]) {
        this.program = new Uint8Array(bytecode);
        this.pc = 0;
    }

    step(): boolean {
        if (!this.running) return false;
        const opcode = this.program[this.pc++];

        switch (opcode) {
            case 0x01: {
                const value = this.program[this.pc++];
                if (value) {
                    this.stack.push(value);
                } else {
                    throw new Error(`LDA instruction needs accompanying parameter`);
                }
                break;
            }
            case 0x02: {
                const ch = String.fromCharCode(this.stack.pop());
                console.log(ch);
                break;
            }
            case 0x03:{
                this.stack.pop(); 
                break;
            }
            case 0x04:{
                this.stack.nip(); 
                break;
            } 
            case 0x05: {
                this.stack.swap(); 
                break;
            }
            case 0x06: {
                this.stack.dup(); 
                break;
            }
            case 0x07:{
                this.stack.ovr(); 
                break;
            }
            case 0x08: {
                this.stack.rot(); 
                break;
            }
            case 0x09: {
                this.stack.clr(); 
                break;
            }
            case 0x0A: { 
                const a = this.stack.pop(); 
                const b = this.stack.pop(); 

                this.stack.push(this.alu.exec("ADD", b, a)); 
                break; 
            }
            case 0x0B: { 
                const a = this.stack.pop(); 
                const b = this.stack.pop(); 
                this.stack.push(this.alu.exec("SUB", b, a)); 
                break; 
            }
            case 0x0C: { 
                const a = this.stack.pop(); 
                const b = this.stack.pop(); 
                this.stack.push(this.alu.exec("MUL", b, a)); 
                break; 
            }
            case 0x0D: { 
                const a = this.stack.pop(); 
                const b = this.stack.pop(); 
                this.stack.push(this.alu.exec("DIV", b, a)); 
                break; 
            }
            case 0x0E: { 
                const a = this.stack.pop(); 
                const b = this.stack.pop(); 
                this.stack.push(this.alu.exec("MOD", b, a)); 
                break; 
            }
            case 0x0F: { 
                const a = this.stack.pop(); 
                const b = this.stack.pop(); 
                this.stack.push(this.alu.exec("AND", b, a)); 
                break; 
            }
            case 0x10: { 
                const a = this.stack.pop(); 
                const b = this.stack.pop(); 
                this.stack.push(this.alu.exec("ORA", b, a)); 
                break; 
            }
            case 0x11: { 
                const a = this.stack.pop(); 
                const b = this.stack.pop(); 
                this.stack.push(this.alu.exec("EOR", b, a)); 
                break; 
            }
            case 0x12: { 
                const a = 0; 
                const b = this.stack.pop(); 
                this.stack.push(this.alu.exec("NOT", b, a)); 
                break; 
            }
            case 0x13: { 
                const a = 0; 
                const b = this.stack.pop(); 
                this.stack.push(this.alu.exec("INC", b, a)); 
                break; 
            }
            case 0x14: { 
                const a = 0; 
                const b = this.stack.pop(); 
                this.stack.push(this.alu.exec("DEC", b, a)); 
                break; 
            }
            case 0x15: { 
                const a = this.stack.pop(); 
                const b = this.stack.pop(); 
                this.stack.push(this.alu.exec("SHL", b, a)); 
                break; 
            }
            case 0x16: { 
                const a = this.stack.pop(); 
                const b = this.stack.pop(); 
                this.stack.push(this.alu.exec("SHR", b, a)); 
                break; 
            }
            case 0x17: { 
                const a = 0; 
                const b = this.stack.pop(); 
                this.stack.push(this.alu.exec("NEG", b, a)); 
                break; 
            }
            case 0x18: {
                console.log(this.stack.peek()); 
                break;
            }
            case 0x19: {
                // LOG: print all stack items
                for (let i = 0; i < this.stack.getStackPointer(); i++) {
                process.stdout.write(`${this.stack.getStackData()[i]} `);
                }
                break;
            }
            // case 0x1A: {
            //     this.display.printStack(this.stack)
            //     break;
            // }
            // case 0x1B: {
            //     this.display.showTop(this.stack.peek())
            //     break;
            // }
            case 0x1C: {
                const addr = this.program[this.pc++];
                if (addr) {
                    const value = this.stack.pop();

                    if (addr == 0){
                        this.ram.addDataAtFreeAddress(value)
                    } else {
                        this.ram.writeDataAt(addr, value);
                    }

                } else {
                    throw new Error(`STA instruction needs accompanying address parameter, use 0x00 if unsure`);
                }
                break;
            }
            case 0x1D: {
                const addr = this.program[this.pc++];
                if (addr) {
                    if (addr == 0){
                        this.stack.push(
                            this.ram.getLastLoadedValue()
                        )
                    } else {
                        this.stack.push(
                            this.ram.getDataAt(addr)
                        );
                    }

                } else {
                    throw new Error(`STA instruction needs accompanying address parameter, use 0x00 if unsure`);
                }
                break;
            }
            case 0xFF: {
                this.running = false; 
                break;
            }
            default: {
                if (opcode){
                    throw new Error(`Unknown opcode: 0x${opcode.toString(16)}`);
                } else {
                    throw new Error(`Unknown opcode: Opcode is undefined.`);
                }
            }
        }
        return this.running;
    }

    run() {
        this.running = true;
        while (this.running) {
            this.step();
        }
    }
}