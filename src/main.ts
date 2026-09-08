import Assembler  from "./assembler.js";
import CPU from "./cpu/cpu.js";

const source = `
VAR age
VAR multiplier

LDA 20
STA age
LDA 2
STA multiplier

LDR age
LDR multiplier
LOG

MUL

OUT
BRK
`;

const cpu = new CPU();
const assembler = new Assembler();
const bytecode = assembler.assemble(source);
cpu.load(bytecode);
cpu.run();