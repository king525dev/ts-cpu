import Assembler  from "./assembler.js";
import CPU from "./cpu/cpu.js";

const source = `
LDA 100
LDA 108
LDA 114
LDA 111
LDA 87
LDA 111
LDA 108
LDA 108
LDA 101
LDA 104
DCD 
DCD
DCD
DCD
DCD
DCD 
DCD
DCD
DCD
DCD
BRK
`;


const assembler = new Assembler();
const bytecode = assembler.assemble(source);
const cpu = new CPU();
cpu.load(bytecode);
cpu.run();