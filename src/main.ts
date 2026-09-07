import Assembler  from "./assembler.js";
import CPU from "./cpu/cpu.js";

const source = `
// This program tests conditional jumps, variables and loops //

LDA 10
STA 0x05

>loop
LDR 0x05
DUP
OUT
DEC
DUP
STA 0x05
LDA 0x00
GTH
JCN loop

BRK
`;

const cpu = new CPU();
const assembler = new Assembler();
const bytecode = assembler.assemble(source);
cpu.load(bytecode);
cpu.run();