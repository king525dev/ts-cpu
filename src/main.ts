import Assembler  from "./assembler.js";
import CPU from "./cpu/cpu.js";

const source = `// This program tests conditional jumps, variables and loops //

LDA 5
STA 0x05

>loop
LDA 0x05
DUP
OUT
DEC
DUP
STA 0x05
LDA 0
GTH
JCN loop

BRK
`;


const assembler = new Assembler();
const bytecode = assembler.assemble(source);
const cpu = new CPU();
cpu.load(bytecode);
cpu.run();