import Assembler  from "./assembler.js";
import CPU from "./cpu/cpu.js";

const source = `
LDA 0x0A
LDA 20
ADD
OUT      ; prints 30
BRK
`;

const assembler = new Assembler();
const bytecode = assembler.assemble(source);
const cpu = new CPU();
cpu.load(bytecode);
cpu.run();