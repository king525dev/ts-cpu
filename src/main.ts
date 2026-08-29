import Assembler  from "./assembler.js";
import CPU from "./cpu/cpu.js";

const source = `
LDA 10
STA 5
LDA 15
STA 6
LDR 5
LDR 6
ADD
OUT
BRK
`;


const assembler = new Assembler();
const bytecode = assembler.assemble(source);
const cpu = new CPU();
cpu.load(bytecode);
cpu.run();